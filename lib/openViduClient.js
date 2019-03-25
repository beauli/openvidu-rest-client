const fetch = require("node-fetch");
const debug = require("debug")("openvidu-rest-client");
const RestApiError = require("./restApiError");
/**
 * initialise openvidu rest client
 * @param {String} baseUrl baseUrl
 * @param {String} secret secret
 */
function openViduClient(baseUrl, secret) {
  this.baseUrl = baseUrl;
  this.basicAuth = getBasicAuth(secret);
}

openViduClient.prototype._getUrl = function(path) {
  return `${this.baseUrl}${path}`;
};

function getBasicAuth(secret) {
  return "Basic " + Buffer.from("OPENVIDUAPP:" + secret).toString("base64");
}
openViduClient.prototype._post = async function(path, data) {
  debug(`post data ${path}`, data);
  const resp = await fetch(this._getUrl(path), {
    method: "POST",
    headers: {
      Authorization: this.basicAuth,
      "content-type": "application/json"
    },
    body: JSON.stringify(data)
  });
  debug(`post data ${path}`, data, resp);
  if (resp && resp.status === 200) {
    return resp.json();
  }
  throw new RestApiError("POST_DATA_FAILED", `post data failed`, {
    request: { path, data },
    resp
  });
};

openViduClient.prototype._get = async function(path) {
  debug(`get data ${path}`);
  const resp = await fetch(this._getUrl(path), {
    method: "GET",
    headers: {
      Authorization: this.basicAuth,
      "content-type": "application/x-www-form-urlencoded"
    }
  });
  debug(`get data ${path}`, resp);
  if (resp && resp.status === 200) {
    return resp.json();
  }
  throw new RestApiError("GET_DATA_FAILED", `get data failed`, {
    request: { path },
    resp
  });
};

openViduClient.prototype._delete = async function(path) {
  const resp = await fetch(this._getUrl(path), {
    method: "DELETE",
    headers: {
      Authorization: this.basicAuth,
      "content-type": "application/x-www-form-urlencoded"
    }
  });
  if (resp) {
    return resp.status;
  }
  throw new RestApiError("DELETE_DATA_FAILED", `get data failed`, {
    request: { path },
    resp
  });
};

/**
 * create session
 * @param {Object} data session data
 * @param {String} data.mediaMode mediaMode, optional , ROUTED (default)
 * @param {String} data.recordingMode recordingMode, optional ,[ALWAYS,MANUAL(default)]
 * @param {String} data.customSessionId customSessionId, optional
 * @param {String} data.defaultOutputMode defaultOutputMode, optional, [COMPOSED(default),INDIVIDUAL]
 * @param {String} data.defaultRecodingLayout defaultRecodingLayout, optional,Only applies if defaultOutputMode is set to COMPOSED [BEST_FIT(default),CUSTOM]
 * @param {String} data.defaultCustomLayout defaultCustomLayout, optional,Only applies if defaultRecordingLayout is set to CUSTOM
 * @returns {Object} {id,createdAt}
 */
openViduClient.prototype.createSession = async function(data) {
  return this._post("/api/sessions", data);
};

/**
 * generate token
 * @param {Object} data input
 * @param {String} data.session sessionId, the sessionId for which the token should be associated
 * @param {String} data.role role, optional, [SUBSCRIBER,PUBLISHER(default),MODERATOR]
 * @param {String} data.data data, optional, metadata associated to this token (usually participant's information)
 * @param {Object} data.kurentoOptions kurentoOptions, optional, you can set some configuration properties for the participant owning this token regarding Kurento.
 * @returns {Object} {token,session,role,data,id,kurentoOptions}
 */
openViduClient.prototype.generateToken = async function(data) {
  return this._post("/api/tokens", data);
};

/**
 * get session info
 * @param {String} sessionId sessionId
 * @returns {Object} session info
 */
openViduClient.prototype.getSessionById = async function(sessionId) {
  return this._get(`/api/sessions/${sessionId}`);
};

/**
 * get active sessions
 * @returns {Object} {numberOfElements,content}
 */
openViduClient.prototype.getActiveSessions = async function() {
  return this._get(`/api/sessions`);
};

/**
 * close session
 * @param {String} sessionId sessionId
 * @returns {Int} response status
 * 204: the session has been successfully closed. Every participant will have received the proper events in OpenVidu Browser: streamDestroyed, connectionDestroyed and sessionDisconnected, all of them with "reason" property set to "sessionClosedByServer". Depending on the order of eviction of the users, some of them will receive more events than the others (the first one will only receive the events related to himself, last one will receive every possible event)
 * 404: no session exists for the passed SESSION_ID
 */
openViduClient.prototype.closeSession = async function(sessionId) {
  return this._delete(`/api/sessions/${sessionId}`);
};

/**
 * close connection
 * @param {String} sessionId sessionId
 * @param {String} connectionId connectionId
 * @returns {Int} response status
 * 204: the user has been successfully evicted from the session. Every participant will have received the proper events in OpenVidu Browser: streamDestroyed if the user was publishing, connectionDestroyed for the remaining users and sessionDisconnected for the evicted user. All of them with "reason" property set to "forceDisconnectByServer"
 * 400: no session exists for the passed SESSION_ID
 * 404: no connection exists for the passed CONNECTION_ID
 */
openViduClient.prototype.closeConnection = async function(
  sessionId,
  connectionId
) {
  return this._delete(`/api/sessions/${sessionId}/connection/${connectionId}`);
};

/**
 * unpublush stream
 * @param {String} sessionId sessionId
 * @param {String} streamId streamId
 * @returns {Int} response status
 * 204: the stream has been successfully unpublished. Every participant will have received the proper streamDestroyed event in OpenVidu Browser with "reason" property set to "forceUnpublishByServer"
 * 400: no session exists for the passed SESSION_ID
 * 404: no stream exists for the passed STREAM_ID
 */
openViduClient.prototype.unpublishStream = async function(sessionId, streamId) {
  return this._delete(`/api/sessions/${sessionId}/stream/${streamId}`);
};

/**
 * start recording
 * @param {Object} data data
 * @param {String} data.session sessionId, required
 * @param {String} data.name optional,the name you want to give to the video file. You can access this same property in openvidu-browser on recordingEvents. If no name is provided, the video file will be named after id property of the recording
 * @param {String} data.outputMode optional, record all streams in a single file in a grid layout or record each stream in its own separate file. This property will override the defaultOutputMode property set on POST /api/sessions for this particular recording
 * COMPOSED(default) : when recording the session, all streams will be composed in the same file in a grid layout
 * INDIVIDUAL: when recording the session, every stream is recorded in its own file
 * @param {Boolean} data.hasAudio optional, whether to record audio or not. Default to true
 * @param {Boolean} data.hasVideo optional, whether to record video or not. Default to true
 * @param {String} data.recordingLayout optional, Only applies if outputMode is set to COMPOSED and hasVideo to true) : the layout to be used in this recording. This property will override the defaultRecordingLayout property set on POST /api/sessions for this particular recording.
 * @param {String} data.customLayout optional, Only applies if recordingLayout is set to CUSTOM) : a relative path indicating the custom recording layout to be used if more than one is available. Default to empty string (if so custom layout expected under path set with openvidu-server system property openvidu.recording.custom-layout) . This property will override the defaultCustomLayout property set on POST /api/sessions for this particular recording
 * @param {String} data.resolution optional, Only applies if outputMode is set to COMPOSED and hasVideo to true) : the resolution of the recorded video file. It is a string indicating the width and height in pixels like this: "1920x1080". Values for both width and height must be between 100 and 1999
 * @returns {Object} json object
 */
openViduClient.prototype.startRecording = async function(data) {
  return this._post(`/api/recordings/start`, data);
};

/**
 * stop recording
 * @param {String} recordingId recording id
 * @returns {Object} json object
 */
openViduClient.prototype.stopRecoding = async function(recordingId) {
  return this._post(`/api/recordings/stop/${recordingId}`);
};

/**
 * stop recording
 * @param {String} recordingId recording id
 * @returns {Object} json object
 */
openViduClient.prototype.getRecording = async function(recordingId) {
  return this._post(`/api/recordings/${recordingId}`);
};

/**
 * get all recordings
 * @returns {Object} {count,items}
 */
openViduClient.prototype.getAllRecordings = async function() {
  return this._post(`/api/recordings`);
};

/**
 * delete recording
 * @param {String} recordingId recording id
 * @returns {Int} response status
 * 204: the video file and all of its metadata has been successfully deleted from the host
 * 404: no recording exists for the passed RECORDING_ID
 * 409: the recording has "started" status. Stop it before deletion
 */
openViduClient.prototype.deleteRecording = async function(recordingId) {
  return this._delete(`/api/recordings/${recordingId}`);
};

/**
 * get openvidu config
 * @returns {Object} json object
 */
openViduClient.prototype.getConfig = async function() {
  return this._get(`/config`);
};

module.exports = openViduClient;
