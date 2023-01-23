variable "project_id" {
  default = "openweathermap-history"
}

variable "region" {
  default = "europe-west1"
}

variable "influxdb_url" {
  type = string
}

variable "influxdb_org" {
  type = string
}

variable "influxdb_bucket" {
  type = string
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}


# Generate an archive of the source code
data "archive_file" "source" {
  type        = "zip"
  source_dir  = "./src"
  output_path = "/tmp/function.zip"
}

resource "google_service_account" "sa" {
  account_id   = "owh-api"
  display_name = "A service account for invoking the OpenWeatherMap History API cloud functions"
}

resource "google_storage_bucket" "function_bucket" {
  name     = "${var.project_id}-function"
  location = var.region
}

resource "google_storage_bucket_object" "zip" {
  source       = data.archive_file.source.output_path
  content_type = "application/zip"

  name   = "src-${data.archive_file.source.output_md5}.zip"
  bucket = google_storage_bucket.function_bucket.name

  depends_on = [
    google_storage_bucket.function_bucket,
    data.archive_file.source
  ]
}

resource "google_cloudfunctions_function" "func-get-rain-forecast" {
  name        = "get-rain-forecast"
  description = "Get rain forecast"
  runtime     = "nodejs16"

  available_memory_mb   = 128
  min_instances         = 0
  max_instances         = 2
  source_archive_bucket = google_storage_bucket.function_bucket.name
  source_archive_object = google_storage_bucket_object.zip.name

  entry_point = "get-rain-forecast"

  trigger_http = true

  labels = {
    app  = "openweathermap"
    type = "service"
  }

  environment_variables = {
    "INFLUXDB_URL"    = var.influxdb_url
    "INFLUXDB_ORG"    = var.influxdb_org
    "INFLUXDB_BUCKET" = var.influxdb_bucket
  }

  secret_environment_variables {
    key     = "INFLUXDB_TOKEN"
    secret  = "openweatherhistory-influxdb-token"
    version = "latest"
  }
}

# IAM entry for all users to invoke the function
resource "google_cloudfunctions_function_iam_member" "get-invoker" {
  project        = google_cloudfunctions_function.func-get-rain-forecast.project
  region         = google_cloudfunctions_function.func-get-rain-forecast.region
  cloud_function = google_cloudfunctions_function.func-get-rain-forecast.name

  role   = "roles/cloudfunctions.invoker"
  member = "serviceAccount:${google_service_account.sa.email}"
}


resource "google_cloudfunctions_function" "func-fetch-data" {
  name        = "fetch-data"
  description = "fetch-data"
  runtime     = "nodejs16"

  available_memory_mb   = 256
  min_instances         = 0
  max_instances         = 1
  source_archive_bucket = google_storage_bucket.function_bucket.name
  source_archive_object = google_storage_bucket_object.zip.name

  entry_point = "fetch-data"

  trigger_http = true

  labels = {
    app  = "openweathermap"
    type = "fetch"
  }

  environment_variables = {
    "INFLUXDB_URL"    = var.influxdb_url
    "INFLUXDB_ORG"    = var.influxdb_org
    "INFLUXDB_BUCKET" = var.influxdb_bucket
  }

  secret_environment_variables {
    key     = "INFLUXDB_TOKEN"
    secret  = "openweatherhistory-influxdb-token"
    version = "latest"
  }

  secret_environment_variables {
    key     = "OPENWEATHER_API_KEY"
    secret  = "openweathermap-api-key"
    version = "latest"
  }
}

# IAM entry for all users to invoke the function
resource "google_cloudfunctions_function_iam_member" "fetch-invoker" {
  project        = google_cloudfunctions_function.func-fetch-data.project
  region         = google_cloudfunctions_function.func-fetch-data.region
  cloud_function = google_cloudfunctions_function.func-fetch-data.name

  role   = "roles/cloudfunctions.invoker"
  member = "serviceAccount:${google_service_account.sa.email}"
}

# Cloud scheduler for fetching data hourly
resource "google_cloud_scheduler_job" "job" {
  name             = "fetch-job"
  description      = "Fetch data hourly"
  schedule         = "0 * * * *"
  time_zone        = "Europe/Berlin"
  attempt_deadline = "320s"

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "GET"
    uri         = google_cloudfunctions_function.func-fetch-data.https_trigger_url
    oidc_token {
      service_account_email = google_service_account.sa.email
    }
  }
}


resource "google_api_gateway_api" "openweathermap_api" {
  provider = google-beta
  api_id   = "owhapi"
}

resource "random_id" "server" {

  byte_length = 8
}

resource "google_api_gateway_api_config" "api_cfg" {
  provider      = google-beta
  api           = google_api_gateway_api.openweathermap_api.api_id
  api_config_id = "cfg-${random_id.server.hex}"

  openapi_documents {
    document {
      path = "spec.yaml"
      contents = base64encode(templatefile("${path.module}/openapi-functions.yml.tpl", {
        get_rain_forecast_url = google_cloudfunctions_function.func-get-rain-forecast.https_trigger_url
      }))
    }
  }
  gateway_config {
    backend_config {
      google_service_account = google_service_account.sa.email
    }
  }
  lifecycle {
    create_before_destroy = true
  }
}

resource "google_api_gateway_gateway" "api_gw" {
  provider   = google-beta
  api_config = google_api_gateway_api_config.api_cfg.id
  gateway_id = "api-gw"
}
