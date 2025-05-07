const { initiateSTKPush } = require('../utils/mpesa');
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
