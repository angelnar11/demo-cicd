import java.security.MessageDigest

@NonCPS
String hashBranchName(String input) {
    MessageDigest digest = MessageDigest.getInstance('SHA256')
    digest.update(input.bytes)
    digest.digest().encodeHex().toString().take(8)
}

def getEnvFromBranch(branch) {
    if (branch == 'master') {
        return 'latest'
  } else {
        return hashBranchName(branch)
    }
}

def getGitBranchName() {
    firstPart = GIT_BRANCH.split('/')[0]
    if (firstPart == 'refs' || firstPart == 'origin') {
        return "${GIT_BRANCH.split('/')[1..-1].join('/')}"
    } else {
        return "${GIT_BRANCH}"
    }
}

pipeline {
    environment {
        GIT_LFS_SKIP_SMUDGE = 1
        GITHUB_TOKEN = credentials('github-angel')
        BRANCH_NAME = getGitBranchName()
    }
    agent {
        label 'dind-agent'
    }

    stages {
        stage('Docker Build & Push') {
            steps {
                dir('application') {
                    sshagent(['github-readonly']) {
                        script {
                            docker.withRegistry('https://ccr.civiceye.com', 'ccr-harbor') {
                                VERSION = getEnvFromBranch(BRANCH_NAME)
                                sh "docker build -t ccr.civiceye.com/civiceye/demo_image:${VERSION} ."
                                def output = sh(returnStdout: true, script: "docker push ccr.civiceye.com/civiceye/demo_image:${VERSION}")
                                VERSION = sh(returnStdout: true, script: "echo \"$output\" | grep -oE 'sha256:[a-z0-9]+' | head -n1 | awk -F ':' '{print \$2}'").trim()
                            }
                        }
                    }
                }
            }
        }
        stage('Update Gitops Repository (Master)') {
            when {
                expression { BRANCH_NAME == 'master' }
            }
            steps {
                sh """
                DIRECTORY="deployments/production"
                if [ -d "\$DIRECTORY" ]; then
                    find \$DIRECTORY -type f -name values.yaml -exec yq e "(.image.sha256 = \\"${VERSION}\\")" -i {} \\;
                fi
                """.stripIndent()
            }
        }
        stage('Update Gitops Repository (Features)') {
            when {
                expression { BRANCH_NAME != 'master' }
            }
            steps {
                sh """
                # Generate deployment variables
                DIRNAME="${BRANCH_NAME}"
                DIRNAME=\$(echo \$DIRNAME | tr '_' '-')
                D2=\$(dirname \$DIRNAME)
                bname=\$(basename \$D2)-\$(basename \$DIRNAME)
                hostname=\$(echo \$bname | tr '/' '-')

                # Replace the image tag in the deployment manifest
                rm -rf deployments/features/\$bname
                mkdir -p deployments/features/\$bname
                cat templates/values.template.yaml | \
                yq e ".image.sha256 = \\"${VERSION}\\"" \
                | yq e ".customer = \\"\$bname\\"" \
                | yq e ".hostname = \\"\$hostname.test-civiceye.com\\"" \
                > deployments/features/\$bname/values.yaml
                """.stripIndent()
            }
        }
        stage('Commit & Push to Gitops Repo Feature Branch') {
            steps {
                sh """
                git config --global user.email 'jenkins-agent@civiceye.com'
                git config --global user.name 'jenkins-agent'
                git remote set-url origin https://$GITHUB_TOKEN@github.com/angelnar11/demo-cicd.git
                git checkout master
                git add -A
                git commit -am "Updated engine image version for Build with commit ID - $VERSION" || true
                git push origin master
                """
            }
        }
    }
}
