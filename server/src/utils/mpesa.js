const axios = require('axios');

const getAccessToken = async () => {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');

  try {
    const response = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('M-Pesa token error:', error);
    throw error;
  }
};

const initiateSTKPush = async (phone, amount) => {
  const token = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, -3);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  try {
    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL, // Use env variable for callback URL
        AccountReference: "Aviator Game",
        TransactionDesc: "Game Deposit"
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('STK push error:', error);
    throw error;
  }
};

const initiateB2C = async (phone, amount) => {
  const token = await getAccessToken();
  try {
    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest',
      {
        InitiatorName: process.env.MPESA_B2C_INITIATOR_NAME, // testapi
        SecurityCredential: process.env.MPESA_B2C_INITIATOR_PASSWORD, // Safaricom123!!
        CommandID: "BusinessPayment",
        Amount: amount,
        PartyA: process.env.MPESA_B2C_SHORTCODE, // 600986
        PartyB: phone, // should be 254708374149 for sandbox
        Remarks: "Withdrawal",
        QueueTimeOutURL: process.env.MPESA_B2C_CALLBACK_URL,
        ResultURL: process.env.MPESA_B2C_CALLBACK_URL,
        Occasion: "Aviator Withdraw"
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('B2C error:', error.response?.data || error);
    throw error;
  }
};

module.exports = { getAccessToken, initiateSTKPush, initiateB2C };
