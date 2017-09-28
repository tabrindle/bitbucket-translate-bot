const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const glob = require('glob-fs');

module.exports.run = function(
  {
    bitbucketUrl = process.env.BITBUCKET_URL,
    debug = false,
    searchGlob = process.env.SEARCH_FILE_GLOB || '**/*.js',
    translationGlob = process.env.TRANSLATION_FILE_GLOB || './locales/*.json',
    jobName = process.env.JOB_NAME, // injected from Jenkins
    password = process.env.BITBUCKET_PASSWORD, // please don't hardcode this
    project = process.env.BITBUCKET_PROJECT,
    pullRequestID = process.env.PULL_REQUEST_ID,
    repository = process.env.BITBUCKET_REPOSITORY,
    stringRegExp = /I18n\.t\(['|"](.+?)['|"](\)|,)/g,
    user = process.env.BITBUCKET_USER
  } = {}
) {
  if (jobName) {
    repository = repository || jobName.split('/')[0];
    if (!/PR-(\d*)/.test(jobName)) {
      console.log('Job is not a PR, and there is no supplied pullRequestID');
      return;
    }
    pullRequestID = pullRequestID || jobName.split('/')[1].match(/PR-(\d*)/)[1];
  }

  requiredParams({
    bitbucketUrl,
    password,
    project,
    pullRequestID,
    repository,
    user
  });

  // eslint-disable-next-line
  const url = `${bitbucketUrl}/rest/api/1.0/projects/${project}/repos/${repository}/pull-requests/${pullRequestID}/comments`;
  const searchFiles = new glob({ gitignore: false }).readdirSync(searchGlob);
  const translatables = [
    ...new Set( // ensure no duplicates
      searchFiles
        .map(searchFile => {
          try {
            if (!fs.lstatSync(searchFile).isDirectory()) {
              // dont try to read directories
              let results = [],
                match;
              while ((match = stringRegExp.exec(fs.readFileSync(searchFile).toString())) !== null) {
                results.push(match[1]); // string.match() doesn't work with global flag on multiple matches
              }
              return results;
            }
          } catch (err) {
            throw err;
          }
        })
        .reduce((a, b) => a.concat(b), []) // un-nest arrays
    )
  ];

  const translationFiles = glob({ gitignore: false }).readdirSync(translationGlob);
  const missing = translationFiles.map(translationFile => {
    try {
      const translationJson = JSON.parse(fs.readFileSync(translationFile).toString());
      return {
        [path.basename(translationFile).split('.')[0]]: translatables
          .map(translatable => {
            if (!translationJson[translatable]) {
              return translatable;
            }
          })
          .filter(Boolean)
      };
    } catch (err) {
      throw err;
    }
  });
  const deDupedMissing = [
    ...new Set( // ensure no duplicates
      missing
        .map(language => {
          // get each language translatable missing array
          return language[Object.keys(language)[0]];
        })
        .reduce((a, b) => a.concat(b), []) // un-nest arrays
    )
  ];
  const missingCount = deDupedMissing.reduce((acc, obj) => {
    return acc + obj[Object.keys(obj)[0]].length; // return only object property array length, add to acc
  }, 0);

  if (debug) {
    console.log('POST to: ', url);
    console.log(
      `[translation] This PR contains ${missingCount} untranslated ${missingCount === 1
        ? 'string'
        : 'strings'}\n  ${deDupedMissing.join('\n  ')}`
    );
    return;
  }

  try {
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        text: `[translation] This PR contains ${missingCount} untranslated ${missingCount === 1
          ? 'string'
          : 'strings'}\n  ${deDupedMissing.join('\n  ')}`
      }),
      credentials: 'include',
      headers: {
        Authorization: encodeAuthorization({ user, password }),
        'Content-Type': 'application/json'
      }
    })
      .then(console.log)
      .catch(console.log);
  } catch (err) {
    throw err;
  }
};

const encodeAuthorization = ({ user, password }) => {
  return `Basic ${new Buffer(`${user}:${password}`, 'binary').toString('base64')}=`;
};

const requiredParams = (params = {}) => {
  const missing = Object.keys(params)
    .filter(filterKey => params[filterKey] === undefined) // eslint-disable-line no-undefined
    .reduce((acc, reduceKey) => `${acc} ${reduceKey}`, '');
  console.log(missing);
  if (missing) {
    throw new TypeError(`The following required parameters are missing:${missing}`);
  } else {
    return true;
  }
};
