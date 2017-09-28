# Bitbucket Translate Bot

Bot to run on CI server to post missing translations on Bitbucket PRs

## Install

`yarn add bitbucket-translate-bot --dev`
  ~or~
`npm install bitbucket-translate-bot --save-dev`

## Config

Most configs can be passed as command line options/env vars

    - bitbucketUrl/BITBUCKET_URL - Base URL of bitbucket to POST to eg https://bitbucket.test.com
    - jobName/JOB_NAME - auto injected Jenkins job name - can extract repository + pullRequestID if setup correctly
    - password/BITBUCKET_PASSWORD - Bitbucket password for user to post comments. Be careful. 
    - project/BITBUCKET_PROJECT - Bitbucket project name eg 'APP'
    - pullRequestID/PULL_REQUEST_ID - Numeric ID of pull request in Bitbucket
    - repository/BITBUCKET_REPOSITORY - Bitbucket repository name eg 'test-project'
    - userBITBUCKET_USER - Bitbucket user to post comments eg 'tabrindle'

    - debug - Print console statements before POSTs 

## Example
