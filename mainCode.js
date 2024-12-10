/**
 * retrieves PowerSchool API token from Google Secret Manager, first checking if current token is valid, if not, then
 * retrieving a new token and storing it for future use
 * @param {string} project - Project ID from google secret manager
 * @param {string} clientID - clientID name from google secret manager
 * @param {string} secret - secret name from google secret manager
 * @param {string} tokenName - token name from google secret manager
 * @returns {string} token as a string to be used in API header as part of Authorization
 */
function ensureFreshToken(
                            project = 'project_name_here', 
                            clientID = 'secret_manager_trial_clientID', 
                            secret = 'secret_manager_trial_clientsecret', 
                            tokenName ='secret_manager_trial_token'
                            ) {
  
  const decodedToken = getGoogleSecret(tokenName, project);

  if (checkToken(decodedToken)) {

    return decodedToken;

  } else {

    const decodedClient = getGoogleSecret(clientID, project);
    const decodedSecret = getGoogleSecret(secret, project);

    const newToken = getToken(decodedClient, decodedSecret);

    setToken(newToken);

    return newToken
  };

}

/**
 * Connects to Google Secret Manager and returns a value
 * @param {string} secretKey - text name of the key for the key/value pair stored in secret manager
 * @returns {string} the secret value as a string
 */
function getGoogleSecret(secretKey, project) {

  const apiUrl = `https://secretmanager.googleapis.com/v1/projects/${project}/secrets/${secretKey}/versions/latest:access`

  const headers = {
    'Authorization': 'Bearer ' + ScriptApp.getOAuthToken(),
    'Content-Type': 'application/json'
  };

  const options = {
    'headers': headers,
  };

  const response = UrlFetchApp.fetch(apiUrl, options);

  if (response.getResponseCode() === 200) {
    console.log(`Successfully retrieved ${secretKey} from Google Secret Manager`);
  } else {
    console.log(`Error retrieving ${secretKey} from Google Secret Manager: ${response.getContentText()}`);
  };

  const decodedAPIKey = Utilities.base64Decode(JSON.parse(response.getContentText())['payload']['data']);

  const apiKey = Utilities.newBlob(decodedAPIKey).getDataAsString();

  return apiKey;
}

/**
 * updates Token in google secret manager
 * @param {string} newToken - updated token to upload to google secret manager for future use
 * @param {string} project - Project ID from google secret manager
 */
function setToken(newToken, project) {

  const apiUrl = `https://secretmanager.googleapis.com/v1/projects/${project}/secrets/${tokenName}:addVersion`;

  const payload = {
    'payload': {
      'data': Utilities.base64Encode(newToken)
    }
  };

  const headers = {
    'Authorization': 'Bearer ' + ScriptApp.getOAuthToken(),
    'Content-Type': 'application/json'
  };

  const options = {
    'method': 'POST',
    'headers': headers,
    'payload': JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(apiUrl, options);

  if (response.getResponseCode() === 200) {
    console.log(`Successfully updated ${tokenName} in Google Secret Manager.`);
  } else {
    console.log(`Error updating ${tokenName} in Google Secret Manager. Error: ${response.getContentText()}`);
  }
}

/**
 * checks currently stored token to see if it's still valid
 * @param {string} decodedToken - token recently retrieved from google secret manager
 * @returns {boolean} results of testing token with PS API
 */
function checkToken(decodedToken) {

  const apiURl = 'https://random.powerschool.com/ws/v1/district/';

  const headers = {
    'Authorization': 'Bearer ' + decodedToken,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const options = {
    'method': 'GET',
    'muteHttpExceptions': true,
    'headers': headers
  };

  const response = UrlFetchApp.fetch(apiURl, options);

  const responseCode = response.getResponseCode();
  //checking for validity of token with 200 code
  if (responseCode !== 200) {
    console.log(`PowerSchool indicates bad token? Error: ${responseCode}`);
    return false;
  } else {
    console.log('PowerSchool says token is good!')
    return true;
  }

}

/**
 * get a new token after last one deemed old
 * @param {string} decodedClient - PowerSchool client ID as raw string
 * @param {string} decodedSecret - PowerSchool secret as raw string
 * @returns {string} New access token as raw string
 */
function getToken(decodedClient, decodedSecret) {
  const apiURL = 'https://random.powerschool.com/oauth/access_token';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    'Authorization': 'Basic ' + Utilities.base64Encode(decodedClient + ':' + decodedSecret)
  };
  const options = {
    'method': 'POST',
    'headers': headers,
    'payload': { 'grant_type': 'client_credentials' }
  }
  const response = UrlFetchApp.fetch(apiURL, options);
  const accessToken = JSON.parse(response.getContentText());
  console.log('New PowerSchool token obtained');
  return accessToken.access_token
}

