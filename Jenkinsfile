pipeline {
  agent {
    kubernetes {
      yaml '''
        apiVersion: v1
        kind: Pod
        spec:
          securityContext:
            runAsUser: 0
          serviceAccountName: jenkins-agent
          containers:
          - name: docker
            image: docker:27.2-dind
            volumeMounts:
            - name: cert-volume
              mountPath: /etc/ssl/certs
              readOnly: true
            securityContext:
              privileged: true
          - name: kubectl
            image: bitnami/kubectl:1.27
            command:
            - cat
            tty: true
          volumes:
          - name: cert-volume
            hostPath:
              path: /etc/ssl/certs
              type: Directory
        '''
    }
  }

  environment {
    HARBOR = credentials('harbor')
  }

  stages {
    stage('Build') {
      steps {
        container('docker') {
          sh 'docker login cme-harbor.int.bobbygeorge.dev -u $HARBOR_USR -p $HARBOR_PSW'
          sh 'docker build -t raindrop-api --cache-to type=inline --cache-from type=registry,ref=cme-harbor.int.bobbygeorge.dev/raindrop/raindrop-api:$GIT_BRANCH --cache-from type=registry,ref=cme-harbor.int.bobbygeorge.dev/raindrop/raindrop-api:latest .'
          sh '! [ "$GIT_BRANCH" = "main" ] || docker tag raindrop-api cme-harbor.int.bobbygeorge.dev/raindrop/raindrop-api:latest'
          sh 'docker tag raindrop-api cme-harbor.int.bobbygeorge.dev/raindrop/raindrop-api:$GIT_BRANCH'
          sh 'docker tag raindrop-api cme-harbor.int.bobbygeorge.dev/raindrop/raindrop-api:$GIT_COMMIT'
          sh 'docker push -a cme-harbor.int.bobbygeorge.dev/raindrop/raindrop-api'
        }
      }
    }

    stage('Deploy Preview') {
      when {
        not {
          branch 'v1'
        }
      }
      steps {
        container('kubectl') {
          sh 'ENV=dev TAG=$GIT_COMMIT NAMESPACE=raindrop-preview PREFIX=raindrop-$(echo "$GIT_BRANCH" | tr \'[:upper:]\' \'[:lower:]\' | sed \'s/[^a-z0-9.-]//g\') DOMAIN=$(echo "$GIT_BRANCH" | tr \'[:upper:]\' \'[:lower:]\' | sed \'s/[^a-z0-9.-]//g\').api-v1.raindrop.bobbygeorge.dev envsubst \'$TAG:$NAMESPACE:$ENV:$PREFIX:$DOMAIN\' < kubernetes.yaml | kubectl apply -f -'
        }
      }
    }
    stage('Deploy Prod') {
      when {
        branch 'v1'
      }
      steps {
        container('kubectl') {
          sh 'ENV=prod TAG=$GIT_COMMIT NAMESPACE=raindrop PREFIX=raindrop DOMAIN=api-v1.raindrop.bobbygeorge.dev envsubst \'$TAG:$NAMESPACE:$ENV:$PREFIX:$DOMAIN\' < kubernetes.yaml | kubectl apply -f -'
        }
      }
    }
  }
}
