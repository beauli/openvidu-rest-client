const { OpenViduClient, RestApiError } = require("./../index");
const client = new OpenViduClient(
  process.env.OpenViduServerUrl,
  process.env.OpenViduSecret
);
describe("openvidu session test", () => {
  const sessionId = Date.now().toString();
  it("# get active sessions", async () => {
    const sessions = await client.getActiveSessions();
    console.log(sessions)
    expect(sessions.numberOfElements > 0).toBeTruthy();
  });

  it("# create session", async () => {
    const result = await client.createSession({
      customSessionId: sessionId
    });
    expect(result.id).toEqual(sessionId);

    try {
      await client.createSession({
        customSessionId: sessionId
      });
    } catch (err) {
      if (err instanceof RestApiError) {
        expect(err.data.resp.status).toEqual(409);
      }
    }
  });

  it('# generate token', async () => {
    const tokenResult = await client.generateToken({ session: sessionId });
    console.log(tokenResult)
    expect(tokenResult.token.length > 0).toBeTruthy();
  })

  // it('# retrieve session info', async () => {
  //   const sessionInfo = await client.getSessionById(sessionId);
  //   console.log(sessionInfo);
  //   expect(sessionInfo.sessionId).toEqual(sessionId);
  // })

  // it("# close session", async () => {
  //   const result = await client.closeSession(sessionId);
  //   expect(result).toEqual(204);
  // });
});
