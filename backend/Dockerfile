# 1단계: build
FROM eclipse-temurin:17-jdk AS build

WORKDIR /app
COPY . .

RUN chmod +x gradlew
RUN ./gradlew bootJar

# 2단계: 실행
FROM eclipse-temurin:17-jre

WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]