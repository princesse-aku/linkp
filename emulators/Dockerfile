# Émulateurs Firebase (Auth + Firestore + interface) pour le développement et les tests.
# Les émulateurs Firestore ont besoin de Java.
FROM eclipse-temurin:21-jre AS java

FROM node:22-slim
COPY --from=java /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk PATH="/opt/java/openjdk/bin:${PATH}"

RUN npm install -g firebase-tools && npm cache clean --force

WORKDIR /firebase
COPY firebase.json firestore.rules firestore.indexes.json start.sh ./
RUN chmod +x start.sh

EXPOSE 4000 8080 9099
CMD ["./start.sh"]
