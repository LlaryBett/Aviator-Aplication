const { initiateSTKPush, initiateB2C } = require('../utils/mpesa');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

exports.initiateDeposit = async (req, res) => {
  console.log('M-Pesa deposit request:', req.body);
  try {
    const { phone, amount } = req.body;
    
    const stkResponse = await initiateSTKPush(phone, amount);
    console.log('STK Push response:', stkResponse);

    await Transaction.create({
      userId: req.user._id, // <-- Correct field name
      amount,
      type: 'deposit',
      status: 'pending',
      mpesa: {
        checkoutRequestID: stkResponse.CheckoutRequestID,
        merchantRequestID: stkResponse.MerchantRequestID,
        phoneNumber: phone
      }
    });

    res.json({
      success: true,
      requestId: stkResponse.CheckoutRequestID,
      message: 'STK push sent'
    });
  } catch (error) {
    console.error('M-Pesa error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.initiateWithdraw = async (req, res) => {
  try {
    const { amount, phone } = req.body;
    if (!amount || !phone) {
      return res.status(400).json({ success: false, message: 'Amount and phone are required' });
    }
    const b2cResponse = await initiateB2C(phone, amount);
    const transaction = new Transaction({
      userId: req.user._id,
      type: 'withdraw',
      amount,
      status: 'pending',
      phoneNumber: phone,
      mpesa: {
        merchantRequestID: b2cResponse.ConversationID
      }
    });
    await transaction.save();
    res.json({ success: true, message: 'Withdrawal request submitted!', transactionId: transaction._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.handleCallback = async (req, res) => {
  console.log('M-Pesa callback received:', req.body);
  try {
    const { Body: { stkCallback } } = req.body;

    const transaction = await Transaction.findOne({
      'mpesa.checkoutRequestID': stkCallback.CheckoutRequestID
    });

    if (!transaction) {
      console.error('Transaction not found for callback:', stkCallback.CheckoutRequestID);
      throw new Error('Transaction not found');
    }

    // Log before updating
    console.log(
      `Updating transaction status for CheckoutRequestID ${stkCallback.CheckoutRequestID}:`,
      `ResultCode=${stkCallback.ResultCode}, ResultDesc=${stkCallback.ResultDesc}`
    );

    // Update status and mpesa result fields
    transaction.status = stkCallback.ResultCode === 0 ? 'completed' : 'failed';
    transaction.mpesa.resultCode = stkCallback.ResultCode;
    transaction.mpesa.resultDesc = stkCallback.ResultDesc;
    await transaction.save();

    // Log after updating
    console.log(
      `Transaction ${transaction._id} updated: status=${transaction.status}, resultCode=${transaction.mpesa.resultCode}`
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.handleB2CCallback = async (req, res) => {
  console.log('M-Pesa B2C callback received:', req.body);
  // You can process the result here, e.g., update transaction status
  res.json({ success: true });
};

exports.getTransactionStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const transaction = await Transaction.findOne({ 'mpesa.checkoutRequestID': requestId });
    if (!transaction) {
      return res.status(404).json({ status: 'not_found' });
    }
    res.json({ status: transaction.status, amount: transaction.amount });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
