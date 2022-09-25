FROM node:18.5.0

EXPOSE 8080
ENV PORT=8080

ARG JAVA_VERSION=11
ARG ANDROID_SDK_VERSION=8512546
ARG ANDROID_BUILD_TOOLS_VERSION=33.0.0
ARG ANDROID_PLATFORMS_VERSION=30
ARG GRADLE_VERSION=7.5.1

# Install Java
RUN apt-get update && apt-get install -qy openjdk-${JAVA_VERSION}-jdk

# Install Gradle
ENV GRADLE_HOME=/opt/gradle
RUN mkdir $GRADLE_HOME \
    && curl -L https://downloads.gradle-dn.com/distributions/gradle-${GRADLE_VERSION}-bin.zip -o gradle-${GRADLE_VERSION}-bin.zip \
    && unzip -d $GRADLE_HOME gradle-${GRADLE_VERSION}-bin.zip
ENV PATH=$PATH:/opt/gradle/gradle-${GRADLE_VERSION}/bin

# Install Android SDK tools
ENV ANDROID_HOME=/opt/android-sdk
RUN curl -L https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_SDK_VERSION}_latest.zip -o commandlinetools-linux-${ANDROID_SDK_VERSION}_latest.zip \
    && unzip commandlinetools-linux-${ANDROID_SDK_VERSION}_latest.zip \
    && mkdir $ANDROID_HOME && mv cmdline-tools $ANDROID_HOME \
    && yes | $ANDROID_HOME/cmdline-tools/bin/sdkmanager --sdk_root=$ANDROID_HOME --licenses \
    && $ANDROID_HOME/cmdline-tools/bin/sdkmanager --sdk_root=$ANDROID_HOME "platform-tools" "build-tools;${ANDROID_BUILD_TOOLS_VERSION}" "platforms;android-${ANDROID_PLATFORMS_VERSION}"
ENV PATH=$PATH:${ANDROID_HOME}/cmdline-tools:${ANDROID_HOME}/platform-tools

RUN mkdir /yarn-cache && \
    chmod 777 /yarn-cache && \
    yarn config set cache-folder /yarn-cache --global && \
    deluser --remove-home node && \
    addgroup notanote && \
    adduser --uid 1000 --ingroup notanote --shell /bin/sh --disabled-password notanote

COPY container_data/known_hosts /home/notanote/.ssh/known_hosts

COPY . /app

WORKDIR /app

RUN --mount=type=cache,target=/yarn-cache cd /app && \
    yarn install --frozen-lockfile --production=false

RUN --mount=type=cache,target=/yarn-cache yarn cap sync android && \
    cd android && \
    ./gradlew build

#RUN --mount=type=cache,target=/yarn-cache yarn build-client && \
#    yarn build-replace-paths && \
#    yarn build && \
#    rm -rf node_modules && \
#    yarn install --frozen-lockfile --production=true && \
#    cd /app && \
#    yarn --frozen-lockfile --production=true

USER notanote

ENTRYPOINT [ "node", "/app/index.js" ]
