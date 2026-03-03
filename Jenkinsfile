pipeline {
    agent any

    environment {
        IMAGE_NAME   = 'laladog'
        CONTAINER    = 'laladog'
        HOST_PORT    = '4094'
    }

    stages {
        stage('Build') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:latest ."
            }
        }

        stage('Deploy') {
            steps {
                sh """
                    docker stop ${CONTAINER} || true
                    docker rm ${CONTAINER}   || true

                    docker run -d \
                        --name ${CONTAINER} \
                        --restart unless-stopped \
                        -p ${HOST_PORT}:80 \
                        ${IMAGE_NAME}:latest
                """
            }
        }
    }

    post {
        success { echo "Deploy succeeded — download at http://<your-server>:${HOST_PORT}/downloads/" }
        failure { echo 'Deploy failed' }
    }
}
