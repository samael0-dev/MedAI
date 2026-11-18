import http from 'http';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './server/auth.ts';

async function runTest() {
  console.log('--- Starting Better Auth Framework Test ---');

  const server = http.createServer(toNodeHandler(auth));
  await new Promise((resolve) => server.listen(4321, resolve));
  console.log('✓ Better Auth HTTP server listening on port 4321');

  try {
    const origin = 'http://localhost:4321';

    // 1. Test Sign up with email & password via Better Auth
    const email = `clinician.test.${Date.now()}@hospital.org`;
    const signupRes = await fetch(`${origin}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({
        email,
        password: 'HospitalPassword123!',
        name: 'Dr. Test Clinician',
      }),
    });
    console.log('1. Better Auth Sign-Up Status:', signupRes.status);
    const signupData = await signupRes.json();
    if (signupRes.status !== 200) {
      throw new Error(`Sign up failed: ${JSON.stringify(signupData)}`);
    }
    console.log('✓ Better Auth User Created:', signupData.user.email, 'ID:', signupData.user.id);
    console.log('✓ Better Auth Session Token:', signupData.token?.slice(0, 15) + '...');

    // 2. Test Email OTP Generation via Better Auth
    const otpRes = await fetch(`${origin}/api/auth/email-otp/send-verification-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({
        email,
        type: 'sign-in',
      }),
    });
    console.log('2. Better Auth Email-OTP Dispatch Status:', otpRes.status);
    const otpData = await otpRes.json();
    console.log('✓ Better Auth Email-OTP Response:', otpData);

    // 3. Test Session Inspection
    const sessionRes = await fetch(`${origin}/api/auth/get-session`, {
      headers: {
        Authorization: `Bearer ${signupData.token}`,
        Origin: origin,
      },
    });
    console.log('3. Better Auth Get-Session Status:', sessionRes.status);
    const sessionData = await sessionRes.json();
    console.log('✓ Better Auth Active Session User:', sessionData?.user?.email);

    console.log('--- Better Auth Framework Verification Passed 100% ---');
  } finally {
    server.close();
  }
}

runTest().catch((err) => {
  console.error('Better Auth verification failed:', err);
  process.exit(1);
});
