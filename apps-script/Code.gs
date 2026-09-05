/**
 * MAIN ENTRY POINT FOR GOOGLE APPS SCRIPT WEB APP
 * Handles HTTP GET and POST requests
 */

function doGet(e) {
  return successResponse({
    status: 'online',
    app: 'Family Expense Manager API',
    time: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    let requestData = {};
    if (e && e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    }

    const action = requestData.action;
    const payload = requestData.payload || {};

    switch (action) {
      case 'getBootstrapData':
        return handleGetBootstrapData();

      case 'getTransactions':
        return handleGetTransactions(payload);

      case 'createTransaction':
        return handleCreateTransaction(payload);

      case 'updateTransaction':
        return handleUpdateTransaction(payload);

      case 'deleteTransaction':
        return handleDeleteTransaction(payload);

      case 'getCategories':
        return handleGetCategories();

      case 'createCategory':
        return handleCreateCategory(payload);

      case 'updateCategory':
        return handleUpdateCategory(payload);

      case 'getBudgets':
        return handleGetBudgets(payload);

      case 'saveBudget':
        return handleSaveBudget(payload);

      case 'getDashboardSummary':
        return handleGetDashboardSummary(payload);

      case 'ping':
        return successResponse({ pong: true, time: new Date().toISOString() });

      default:
        return errorResponse('Hành động (action) không được hỗ trợ: ' + action, 'INVALID_ACTION');
    }
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return errorResponse(error.message || 'Lỗi xử lý yêu cầu máy chủ', 'SERVER_ERROR');
  }
}
