import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Get credentials from environment variables
    const validUsername = process.env.ORDERS_LIST_USERNAME || 'admin';
    const validPassword = process.env.ORDERS_LIST_PASSWORD || 'sukses123';
    const salesUsername = process.env.SALES_USERNAME;
    const salesPassword = process.env.SALES_PASSWORD;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (username === validUsername && password === validPassword) {
      return NextResponse.json({ success: true, role: 'admin' });
    }

    // Support a simple Sales user via env vars (SALES_USERNAME / SALES_PASSWORD)
    if (
      salesUsername &&
      salesPassword &&
      username === salesUsername &&
      password === salesPassword
    ) {
      return NextResponse.json({ success: true, role: 'sales', salesId: username });
    }

    return NextResponse.json(
      { error: 'Invalid username or password' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Error in login:', error);
    return NextResponse.json(
      { error: 'Failed to process login' },
      { status: 500 }
    );
  }
}
