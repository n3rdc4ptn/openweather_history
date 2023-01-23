# openapi2-functions.yaml
swagger: "2.0"
info:
  title: Openweathermap History
  description: Openweathermap History API to fetch historical weather data
  version: 2.0.0
schemes:
  - https
produces:
  - application/json
security:
  - api_key: []
securityDefinitions:
  api_key:
    type: apiKey
    name: key
    in: query
x-google-management:
  metrics:
    - name: "anfrage"
      displayName: "Anfragen"
      valueType: INT64
      metricKind: DELTA
  quota:
    limits:
      - name: "Standardanfragenlimit"
        metric: "anfrage"
        unit: "1/min/{project}"
        values:
          STANDARD: 100
paths:
  /rain:
    get:
      summary: Get rain data
      operationId: rain
      x-google-backend:
        address: ${get_rain_forecast_url}
      x-google-quota:
        metricCosts:
          anfrage: 1
      parameters:
        - name: location
          type: string
          in: path
          required: true
          description: Location to fetch data for
      responses:
        "200":
          description: A successful response
          schema:
            type: object
            properties:
              type:
                type: string
                default: "sum"
              value:
                type: number
                default: 0
              unit:
                type: string
                default: "mm"
