/**
 * PayCore Wallet - Enterprise Transaction Platform
 * Pure Vanilla JavaScript Application
 */

const API_BASE = (window.location.protocol === 'http:' || window.location.protocol === 'https:') && window.location.port === '8080'
  ? '/api/v1'
  : 'http://localhost:8080/api/v1';

let currentUser = null;
let currentWallet = null;
let currentCustTxnPage = 0;
let currentAdminUserPage = 0;
let currentAdminTxnPage = 0;
let adminUserSearchTimer = null;
let adminTxnSearchTimer = null;
let pendingTransferPayload = null;

// ============================================================================
// API CLIENT
// ============================================================================
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('wallet_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (response.status === 403 && data.error === 'PASSWORD_RESET_REQUIRED') {
      openModal('modal-force-reset');
      throw new Error(data.message || 'First login password reset required.');
    }

    if (!response.ok) {
      const errorMsg = data.message || data.error || `Request failed (${response.status})`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle-2';
  if (type === 'error') iconName = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================================================
// MODAL CONTROLLERS
// ============================================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    lucide.createIcons();
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Close modal when clicking on backdrop
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

// ============================================================================
// AUTHENTICATION & SESSION
// ============================================================================
function quickFillLogin(identifier, password) {
  document.getElementById('login-identifier').value = identifier;
  document.getElementById('login-password').value = password;
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-login-submit');
  const identifier = document.getElementById('login-identifier').value.trim();
  const password = document.getElementById('login-password').value;

  btn.disabled = true;
  btn.innerHTML = '<span>Authenticating...</span>';

  try {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: identifier, password })
    });

    if (res.success && res.data) {
      localStorage.setItem('wallet_token', res.data.token);
      localStorage.setItem('wallet_user', JSON.stringify(res.data));
      currentUser = res.data;

      if (res.data.passwordResetRequired) {
        openModal('modal-force-reset');
      } else {
        showToast('Login successful! Welcome to PayCore.', 'success');
        initAppView();
      }
    }
  } catch (err) {
    showToast(err.message || 'Login failed. Please verify credentials.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Sign In</span><i data-lucide="arrow-right"></i>';
    lucide.createIcons();
  }
});

async function handleForceResetSubmit(e) {
  e.preventDefault();
  const tempPass = document.getElementById('reset-temp-password').value;
  const newPass = document.getElementById('reset-new-password').value;
  const confirmPass = document.getElementById('reset-confirm-password').value;

  if (newPass !== confirmPass) {
    showToast('New passwords do not match.', 'error');
    return;
  }

  try {
    const res = await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ temporaryPassword: tempPass, newPassword: newPass })
    });

    if (res.success) {
      showToast('Password updated successfully! Welcome.', 'success');
      localStorage.setItem('wallet_token', res.data.token);
      if (currentUser) currentUser.passwordResetRequired = false;
      localStorage.setItem('wallet_user', JSON.stringify(currentUser));
      closeModal('modal-force-reset');
      initAppView();
    }
  } catch (err) {
    showToast(err.message || 'Password reset failed', 'error');
  }
}

function handleLogout() {
  localStorage.removeItem('wallet_token');
  localStorage.removeItem('wallet_user');
  currentUser = null;
  currentWallet = null;
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('auth-view').classList.remove('hidden');
  showToast('You have been logged out.', 'info');
}

// ============================================================================
// APP VIEW INITIALIZATION & ROUTING
// ============================================================================
async function initAppView() {
  const savedUser = localStorage.getItem('wallet_user');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch (_) {}
  }

  // Update header user profile
  document.getElementById('header-user-name').textContent = currentUser.fullName || 'User';
  document.getElementById('header-user-email').textContent = currentUser.email || '';
  document.getElementById('header-user-id').textContent = `ID: ${currentUser.userNumber || currentUser.userId || '—'}`;

  // Toggle navigation menus based on role
  const isAdmin = currentUser.role === 'ROLE_ADMIN';
  document.getElementById('customer-nav').classList.toggle('hidden', isAdmin);
  document.getElementById('admin-nav').classList.toggle('hidden', !isAdmin);

  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');

  if (isAdmin) {
    switchTab('admin-dashboard');
  } else {
    switchTab('cust-dashboard');
  }
  lucide.createIcons();
}

function navigateToDefault() {
  if (currentUser && currentUser.role === 'ROLE_ADMIN') {
    switchTab('admin-dashboard');
  } else {
    switchTab('cust-dashboard');
  }
}

function switchTab(tabId) {
  // Hide all views
  document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));
  
  // Unset all active nav links
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

  // Highlight active link
  const activeBtn = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  // Show selected view
  const targetView = document.getElementById(`view-${tabId}`);
  if (targetView) targetView.classList.remove('hidden');

  // Trigger data loader
  if (tabId === 'cust-dashboard') loadCustomerDashboard();
  if (tabId === 'cust-transactions') loadCustomerTransactions(0);
  if (tabId === 'cust-disputes') loadCustomerDisputes();
  if (tabId === 'admin-dashboard') loadAdminDashboardMetrics();
  if (tabId === 'admin-users') loadAdminUsers('', 0);
  if (tabId === 'admin-transactions') loadAdminTransactions('', 0);
  if (tabId === 'admin-issues') loadAdminIssues();
  if (tabId === 'admin-audit') loadAdminAuditLogs();

  lucide.createIcons();
}

// Bind nav clicks
document.querySelectorAll('.nav-link').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-tab');
    if (tab && tab !== 'cust-transfer') {
      switchTab(tab);
    }
  });
});

// ============================================================================
// CUSTOMER: DASHBOARD & WALLET
// ============================================================================
async function loadCustomerDashboard() {
  try {
    const res = await apiRequest('/wallet');
    if (res.success && res.data) {
      currentWallet = res.data;
      const formattedBalance = `₹${parseFloat(currentWallet.balance).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;

      document.getElementById('wallet-balance-amount').textContent = formattedBalance;
      document.getElementById('wallet-status-badge').textContent = currentWallet.status;
      document.getElementById('wallet-number-badge').textContent = currentWallet.walletNumber;
      document.getElementById('wallet-userid-badge').textContent = `User ID: ${currentWallet.userNumber || currentUser.userNumber || '—'}`;
      document.getElementById('invariants-owner-name').textContent = currentWallet.userFullName;
      document.getElementById('transfer-modal-avail-balance').textContent = formattedBalance;
    }
  } catch (err) {
    showToast(err.message, 'error');
  }

  // Load recent 5 transactions
  try {
    const res = await apiRequest('/transactions?page=0&size=5');
    const tbody = document.getElementById('cust-recent-txns-tbody');
    tbody.innerHTML = '';

    if (res.success && res.data && res.data.content && res.data.content.length > 0) {
      res.data.content.forEach(txn => {
        const isDebit = txn.userRoleInTxn === 'DEBIT';
        const sign = isDebit ? '-' : '+';
        const colorClass = isDebit ? 'text-rose' : 'text-emerald';
        const counterparty = txn.type === 'TOP_UP' 
          ? 'System Treasury Clearing' 
          : isDebit ? `To: ${txn.receiverEmail}` : `From: ${txn.senderEmail}`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="font-mono" style="font-size:0.75rem;">${txn.referenceNumber}</td>
          <td><span class="badge ${txn.type === 'TOP_UP' ? 'badge-info' : 'badge-neutral'}">${txn.type}</span></td>
          <td>
            <div style="font-weight:600;color:#ffffff;">${counterparty}</div>
            ${txn.note ? `<div style="font-size:0.7rem;color:var(--text-muted);font-style:italic;">"${txn.note}"</div>` : ''}
          </td>
          <td class="text-right font-mono ${colorClass}" style="font-weight:700;">${sign}₹${parseFloat(txn.amount).toFixed(2)}</td>
          <td><span class="badge ${txn.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}">${txn.status}</span></td>
          <td class="text-right">
            <button class="btn-secondary" style="padding:4px 8px;font-size:0.75rem;" onclick="openLedgerModal('${txn.referenceNumber}')">
              <span>Ledger</span>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted);">No transactions recorded yet.</td></tr>';
    }
  } catch (err) {
    console.error('Failed to load recent txns:', err);
  }
  lucide.createIcons();
}

// TOP-UP MODAL
function openTopUpModal() {
  document.getElementById('topup-amount').value = '1000';
  document.getElementById('topup-note').value = 'Add money to wallet';
  openModal('modal-topup');
}

async function handleTopUpSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-topup-submit');
  const amount = parseFloat(document.getElementById('topup-amount').value);
  const note = document.getElementById('topup-note').value.trim();

  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid positive amount', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Processing...';

  const idempotencyKey = `TOPUP-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  try {
    const res = await apiRequest('/wallet/top-up', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ amount, note })
    });

    if (res.success) {
      showToast(`Successfully added ₹${amount.toFixed(2)} to your wallet!`, 'success');
      closeModal('modal-topup');
      loadCustomerDashboard();
    }
  } catch (err) {
    showToast(err.message || 'Top-up failed', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm Deposit';
  }
}

// SEND MONEY MODAL (2-STEP)
function openTransferModal() {
  document.getElementById('transfer-recipient').value = '';
  document.getElementById('transfer-amount').value = '';
  document.getElementById('transfer-note').value = '';
  document.getElementById('transfer-step1-form').classList.remove('hidden');
  document.getElementById('transfer-step2-confirm').classList.add('hidden');
  
  if (currentWallet) {
    document.getElementById('transfer-modal-avail-balance').textContent = `₹${parseFloat(currentWallet.balance).toFixed(2)}`;
  }
  openModal('modal-transfer');
}

function handleTransferReview(e) {
  e.preventDefault();
  const recipient = document.getElementById('transfer-recipient').value.trim();
  const amount = parseFloat(document.getElementById('transfer-amount').value);
  const note = document.getElementById('transfer-note').value.trim();

  if (!recipient) {
    showToast('Recipient Email or 7-Digit User ID is required', 'error');
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid transfer amount', 'error');
    return;
  }

  if (currentWallet && amount > currentWallet.balance) {
    showToast(`Insufficient balance. Max available: ₹${currentWallet.balance.toFixed(2)}`, 'error');
    return;
  }

  pendingTransferPayload = { receiverEmail: recipient, amount, note };

  // Populate Review step
  document.getElementById('confirm-recipient-text').textContent = recipient;
  document.getElementById('confirm-amount-text').textContent = `₹${amount.toFixed(2)}`;
  const balanceAfter = (currentWallet ? currentWallet.balance : 0) - amount;
  document.getElementById('confirm-balance-after-text').textContent = `₹${balanceAfter.toFixed(2)}`;
  document.getElementById('confirm-note-text').textContent = note || '—';

  document.getElementById('transfer-step1-form').classList.add('hidden');
  document.getElementById('transfer-step2-confirm').classList.remove('hidden');
}

function backToTransferStep1() {
  document.getElementById('transfer-step2-confirm').classList.add('hidden');
  document.getElementById('transfer-step1-form').classList.remove('hidden');
}

async function executeTransfer() {
  if (!pendingTransferPayload) return;
  const btn = document.getElementById('btn-transfer-execute');
  btn.disabled = true;
  btn.textContent = 'Processing Transfer...';

  const idempotencyKey = `TRF-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  try {
    const res = await apiRequest('/transfers', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(pendingTransferPayload)
    });

    if (res.success) {
      showToast(`Transfer of ₹${pendingTransferPayload.amount.toFixed(2)} completed successfully!`, 'success');
      closeModal('modal-transfer');
      loadCustomerDashboard();
    }
  } catch (err) {
    showToast(err.message || 'Transfer failed', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm & Send';
  }
}

// ============================================================================
// CUSTOMER: TRANSACTION HISTORY TAB
// ============================================================================
async function loadCustomerTransactions(page = 0) {
  currentCustTxnPage = page;
  try {
    const res = await apiRequest(`/transactions?page=${page}&size=10`);
    const tbody = document.getElementById('cust-all-txns-tbody');
    tbody.innerHTML = '';

    if (res.success && res.data && res.data.content && res.data.content.length > 0) {
      res.data.content.forEach(txn => {
        const isDebit = txn.userRoleInTxn === 'DEBIT';
        const sign = isDebit ? '-' : '+';
        const colorClass = isDebit ? 'text-rose' : 'text-emerald';
        const counterparty = txn.type === 'TOP_UP' 
          ? 'System Treasury Clearing' 
          : isDebit ? `To: ${txn.receiverEmail}` : `From: ${txn.senderEmail}`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="font-mono text-cyan" style="font-size:0.75rem;">${txn.referenceNumber}</td>
          <td style="font-size:0.75rem;">${new Date(txn.createdAt).toLocaleString()}</td>
          <td><span class="badge ${txn.type === 'TOP_UP' ? 'badge-info' : 'badge-neutral'}">${txn.type}</span></td>
          <td>
            <div style="font-weight:600;color:#ffffff;">${counterparty}</div>
            ${txn.note ? `<div style="font-size:0.7rem;color:var(--text-muted);font-style:italic;">"${txn.note}"</div>` : ''}
          </td>
          <td class="text-right font-mono ${colorClass}" style="font-weight:700;">${sign}₹${parseFloat(txn.amount).toFixed(2)}</td>
          <td><span class="badge ${txn.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}">${txn.status}</span></td>
          <td class="text-right">
            <button class="btn-secondary" style="padding:4px 8px;font-size:0.75rem;" onclick="openLedgerModal('${txn.referenceNumber}')">
              <span>Ledger</span>
            </button>
            <button class="btn-secondary" style="padding:4px 8px;font-size:0.75rem;margin-left:4px;" onclick="prefillDispute('${txn.referenceNumber}')">
              <span>Dispute</span>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById('cust-txns-pagination-info').textContent = 
        `Page ${res.data.number + 1} of ${res.data.totalPages} (${res.data.totalElements} records)`;
      document.getElementById('cust-txns-prev-btn').disabled = res.data.number <= 0;
      document.getElementById('cust-txns-next-btn').disabled = res.data.number >= res.data.totalPages - 1;
    } else {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">No transactions recorded.</td></tr>';
      document.getElementById('cust-txns-pagination-info').textContent = 'No records';
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
  lucide.createIcons();
}

function custChangeTxnPage(delta) {
  loadCustomerTransactions(currentCustTxnPage + delta);
}

// ============================================================================
// DOUBLE-ENTRY LEDGER INSPECTOR MODAL
// ============================================================================
async function openLedgerModal(reference) {
  try {
    const res = await apiRequest(`/transactions/${reference}`);
    if (res.success && res.data) {
      const txn = res.data;
      document.getElementById('ledger-txn-ref').textContent = txn.referenceNumber;
      document.getElementById('ledger-txn-meta').textContent = `₹${parseFloat(txn.amount).toFixed(2)} (${txn.type} • ${txn.status})`;

      const tbody = document.getElementById('ledger-entries-tbody');
      tbody.innerHTML = '';

      if (txn.ledgerEntries && txn.ledgerEntries.length > 0) {
        txn.ledgerEntries.forEach(entry => {
          const isDebit = entry.entryType === 'DEBIT';
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>
              <span class="badge ${isDebit ? 'badge-danger' : 'badge-success'}">${entry.entryType}</span>
            </td>
            <td class="font-mono" style="font-size:0.75rem;">${entry.walletNumber}</td>
            <td>
              <div style="font-weight:600;color:#ffffff;">${entry.userFullName || 'Account'}</div>
              <div style="font-size:0.7rem;color:var(--text-muted);">${entry.userEmail || ''}</div>
            </td>
            <td class="text-right font-mono" style="font-weight:700;color:${isDebit ? 'var(--rose-500)' : 'var(--emerald-500)'};">
              ${isDebit ? '-' : '+'}₹${parseFloat(entry.amount).toFixed(2)}
            </td>
            <td class="text-right font-mono text-cyan" style="font-size:0.8rem;">
              ₹${parseFloat(entry.balanceAfter).toFixed(2)}
            </td>
          `;
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--text-muted);">No ledger rows found.</td></tr>';
      }

      openModal('modal-ledger');
    }
  } catch (err) {
    showToast('Failed to load ledger: ' + err.message, 'error');
  }
}

// ============================================================================
// CUSTOMER: DISPUTES DESK TAB
// ============================================================================
async function loadCustomerDisputes() {
  try {
    const res = await apiRequest('/issues');
    const tbody = document.getElementById('cust-issues-tbody');
    tbody.innerHTML = '';

    if (res.success && res.data && res.data.length > 0) {
      res.data.forEach(issue => {
        let badgeClass = 'badge-warning';
        if (issue.status === 'RESOLVED') badgeClass = 'badge-success';
        if (issue.status === 'IN_PROGRESS') badgeClass = 'badge-info';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="font-mono text-cyan" style="font-size:0.75rem;">${issue.issueReference}</td>
          <td class="font-mono" style="font-size:0.75rem;">${issue.transactionReference}</td>
          <td>
            <div style="font-weight:600;color:#ffffff;">${issue.title}</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">${issue.description}</div>
          </td>
          <td><span class="badge ${badgeClass}">${issue.status}</span></td>
          <td style="font-size:0.8rem;color:var(--text-secondary);">
            ${issue.resolutionNotes ? `<span class="text-emerald">${issue.resolutionNotes}</span>` : '<span class="text-muted italic">Under review</span>'}
          </td>
          <td style="font-size:0.75rem;">${new Date(issue.createdAt).toLocaleDateString()}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">No dispute tickets filed.</td></tr>';
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
  lucide.createIcons();
}

function openCreateIssueModal() {
  document.getElementById('issue-txn-ref').value = '';
  document.getElementById('issue-title').value = '';
  document.getElementById('issue-desc').value = '';
  openModal('modal-create-issue');
}

function prefillDispute(txnRef) {
  document.getElementById('issue-txn-ref').value = txnRef;
  document.getElementById('issue-title').value = 'Transaction Discrepancy';
  document.getElementById('issue-desc').value = 'Please inspect transaction debit/credit records.';
  openModal('modal-create-issue');
}

async function handleCreateIssueSubmit(e) {
  e.preventDefault();
  const transactionReference = document.getElementById('issue-txn-ref').value.trim();
  const title = document.getElementById('issue-title').value.trim();
  const description = document.getElementById('issue-desc').value.trim();

  try {
    const res = await apiRequest('/issues', {
      method: 'POST',
      body: JSON.stringify({ transactionReference, title, description })
    });

    if (res.success) {
      showToast('Dispute ticket submitted successfully!', 'success');
      closeModal('modal-create-issue');
      loadCustomerDisputes();
    }
  } catch (err) {
    showToast(err.message || 'Failed to file dispute', 'error');
  }
}

// ============================================================================
// ADMIN: DASHBOARD METRICS
// ============================================================================
async function loadAdminDashboardMetrics() {
  try {
    const res = await apiRequest('/admin/dashboard');
    if (res.success && res.data) {
      const d = res.data;
      document.getElementById('m-total-users').textContent = d.totalUsers || 0;
      document.getElementById('m-active-users').textContent = `${d.activeUsers || 0} active`;
      document.getElementById('m-inactive-users').textContent = `${d.inactiveUsers || 0} inactive`;
      document.getElementById('m-total-wallets').textContent = d.totalWallets || 0;
      document.getElementById('m-total-transactions').textContent = d.totalTransactions || 0;
      document.getElementById('m-total-volume').textContent = `₹${parseFloat(d.totalVolume || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      document.getElementById('m-total-debits').textContent = `₹${parseFloat(d.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      document.getElementById('m-total-credits').textContent = `₹${parseFloat(d.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      document.getElementById('m-open-issues').textContent = d.openIssues || 0;
    }
  } catch (err) {
    showToast('Failed to load metrics: ' + err.message, 'error');
  }
}

// ============================================================================
// ADMIN: USERS & WALLETS TAB
// ============================================================================
async function loadAdminUsers(query = '', page = 0) {
  currentAdminUserPage = page;
  try {
    const res = await apiRequest(`/admin/users?query=${encodeURIComponent(query)}&page=${page}&size=10`);
    const tbody = document.getElementById('admin-users-tbody');
    tbody.innerHTML = '';

    if (res.success && res.data && res.data.content && res.data.content.length > 0) {
      res.data.content.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="font-mono text-cyan" style="font-weight:700;font-size:0.8rem;">${u.userNumber || '—'}</td>
          <td>
            <div style="font-weight:600;color:#ffffff;">${u.fullName}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${u.email}</div>
          </td>
          <td><span class="badge ${u.role === 'ROLE_ADMIN' ? 'badge-warning' : 'badge-neutral'}">${u.role}</span></td>
          <td class="font-mono" style="font-size:0.75rem;">${u.walletNumber || 'None'}</td>
          <td class="text-right font-mono" style="font-weight:700;color:#ffffff;">₹${parseFloat(u.walletBalance || 0).toFixed(2)}</td>
          <td>
            <span class="badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">${u.status}</span>
          </td>
          <td>
            <span class="badge ${u.passwordResetRequired ? 'badge-warning' : 'badge-neutral'}">
              ${u.passwordResetRequired ? 'Reset Mandated' : 'Active Password'}
            </span>
          </td>
          <td class="text-right" style="white-space:nowrap;">
            <button class="btn-secondary" style="padding:4px 8px;font-size:0.75rem;" title="Toggle Account Status" onclick="adminToggleUserStatus(${u.id}, '${u.status}')">
              <i data-lucide="power" style="width:12px;height:12px;"></i>
            </button>
            <button class="btn-secondary" style="padding:4px 8px;font-size:0.75rem;margin-left:4px;" title="Reset Credentials" onclick="adminResetUserCredentials(${u.id}, '${u.email}')">
              <i data-lucide="key-round" style="width:12px;height:12px;"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById('admin-users-pagination-info').textContent = 
        `Page ${res.data.number + 1} of ${res.data.totalPages} (${res.data.totalElements} users)`;
      document.getElementById('admin-users-prev-btn').disabled = res.data.number <= 0;
      document.getElementById('admin-users-next-btn').disabled = res.data.number >= res.data.totalPages - 1;
    } else {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">No users found.</td></tr>';
      document.getElementById('admin-users-pagination-info').textContent = 'No records';
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
  lucide.createIcons();
}

function debounceAdminUserSearch() {
  clearTimeout(adminUserSearchTimer);
  adminUserSearchTimer = setTimeout(() => {
    const query = document.getElementById('admin-user-search-input').value.trim();
    loadAdminUsers(query, 0);
  }, 350);
}

function adminChangeUserPage(delta) {
  const query = document.getElementById('admin-user-search-input').value.trim();
  loadAdminUsers(query, currentAdminUserPage + delta);
}

function openCreateUserModal() {
  document.getElementById('user-fullname').value = '';
  document.getElementById('user-email').value = '';
  document.getElementById('user-phone').value = '';
  document.getElementById('user-role').value = 'ROLE_CUSTOMER';
  document.getElementById('user-init-password').value = '';
  openModal('modal-create-user');
}

async function handleCreateUserSubmit(e) {
  e.preventDefault();
  const fullName = document.getElementById('user-fullname').value.trim();
  const email = document.getElementById('user-email').value.trim();
  const phone = document.getElementById('user-phone').value.trim() || undefined;
  const role = document.getElementById('user-role').value;
  const initialPassword = document.getElementById('user-init-password').value.trim() || undefined;

  try {
    const res = await apiRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, phone, role, initialPassword })
    });

    if (res.success && res.data) {
      closeModal('modal-create-user');
      showToast('User created successfully!', 'success');

      // Show credentials modal
      document.getElementById('creds-modal-userid').textContent = res.data.userNumber || '—';
      document.getElementById('creds-modal-email').textContent = res.data.email;
      document.getElementById('creds-modal-password').textContent = res.data.temporaryPassword || 'Configured';
      openModal('modal-user-creds');

      loadAdminUsers('', 0);
    }
  } catch (err) {
    showToast(err.message || 'Failed to create user', 'error');
  }
}

function copyPasswordToClipboard() {
  const pass = document.getElementById('creds-modal-password').textContent;
  navigator.clipboard.writeText(pass).then(() => {
    document.getElementById('copy-btn-label').textContent = 'Copied!';
    setTimeout(() => document.getElementById('copy-btn-label').textContent = 'Copy', 2000);
  });
}

async function adminToggleUserStatus(userId, currentStatus) {
  const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  try {
    await apiRequest(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`User status updated to ${newStatus}`, 'success');
    loadAdminUsers('', currentAdminUserPage);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function adminResetUserCredentials(userId, email) {
  if (!confirm(`Generate temporary credentials for ${email}? They will be mandated to change password upon next login.`)) {
    return;
  }

  try {
    const res = await apiRequest(`/admin/users/${userId}/reset-password`, { method: 'POST' });
    if (res.success && res.data) {
      document.getElementById('creds-modal-userid').textContent = res.data.userNumber || '—';
      document.getElementById('creds-modal-email').textContent = res.data.email;
      document.getElementById('creds-modal-password').textContent = res.data.temporaryPassword || 'Reset';
      openModal('modal-user-creds');
      loadAdminUsers('', currentAdminUserPage);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================================
// ADMIN: ALL TRANSACTIONS TAB
// ============================================================================
async function loadAdminTransactions(query = '', page = 0) {
  currentAdminTxnPage = page;
  try {
    const res = await apiRequest(`/admin/transactions?query=${encodeURIComponent(query)}&page=${page}&size=10`);
    const tbody = document.getElementById('admin-txns-tbody');
    tbody.innerHTML = '';

    if (res.success && res.data && res.data.content && res.data.content.length > 0) {
      res.data.content.forEach(txn => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="font-mono text-cyan" style="font-size:0.75rem;">${txn.referenceNumber}</td>
          <td style="font-size:0.75rem;">${new Date(txn.createdAt).toLocaleString()}</td>
          <td style="font-size:0.75rem;">${txn.senderEmail}</td>
          <td style="font-size:0.75rem;">${txn.receiverEmail}</td>
          <td><span class="badge ${txn.type === 'TOP_UP' ? 'badge-info' : 'badge-neutral'}">${txn.type}</span></td>
          <td class="text-right font-mono" style="font-weight:700;color:#ffffff;">₹${parseFloat(txn.amount).toFixed(2)}</td>
          <td><span class="badge ${txn.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}">${txn.status}</span></td>
          <td class="text-right">
            <button class="btn-secondary" style="padding:4px 8px;font-size:0.75rem;" onclick="openLedgerModal('${txn.referenceNumber}')">
              <span>Inspect Ledger</span>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById('admin-txns-pagination-info').textContent = 
        `Page ${res.data.number + 1} of ${res.data.totalPages} (${res.data.totalElements} records)`;
      document.getElementById('admin-txns-prev-btn').disabled = res.data.number <= 0;
      document.getElementById('admin-txns-next-btn').disabled = res.data.number >= res.data.totalPages - 1;
    } else {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">No transactions found.</td></tr>';
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
  lucide.createIcons();
}

function debounceAdminTxnSearch() {
  clearTimeout(adminTxnSearchTimer);
  adminTxnSearchTimer = setTimeout(() => {
    const query = document.getElementById('admin-txns-search-input').value.trim();
    loadAdminTransactions(query, 0);
  }, 350);
}

function adminChangeTxnPage(delta) {
  const query = document.getElementById('admin-txns-search-input').value.trim();
  loadAdminTransactions(query, currentAdminTxnPage + delta);
}

// ============================================================================
// ADMIN: DISPUTES DESK TAB
// ============================================================================
async function loadAdminIssues() {
  try {
    const res = await apiRequest('/admin/issues?page=0&size=20');
    const tbody = document.getElementById('admin-issues-tbody');
    tbody.innerHTML = '';

    if (res.success && res.data && res.data.content && res.data.content.length > 0) {
      res.data.content.forEach(issue => {
        let badgeClass = 'badge-warning';
        if (issue.status === 'RESOLVED') badgeClass = 'badge-success';
        if (issue.status === 'IN_PROGRESS') badgeClass = 'badge-info';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="font-mono text-cyan" style="font-size:0.75rem;">${issue.issueReference}</td>
          <td class="font-mono" style="font-size:0.75rem;">${issue.transactionReference}</td>
          <td>
            <div style="font-weight:600;color:#ffffff;">${issue.reportedByName}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${issue.reportedByEmail}</div>
          </td>
          <td>
            <div style="font-weight:600;color:#ffffff;">${issue.title}</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">${issue.description}</div>
          </td>
          <td><span class="badge ${badgeClass}">${issue.status}</span></td>
          <td style="font-size:0.8rem;color:var(--text-secondary);">
            ${issue.resolutionNotes ? `<span class="text-emerald">${issue.resolutionNotes}</span>` : '<span class="text-muted italic">Pending</span>'}
          </td>
          <td class="text-right">
            <button class="btn-secondary" style="padding:4px 8px;font-size:0.75rem;" onclick="openUpdateIssueModal(${issue.id}, '${issue.issueReference}', '${escapeHtml(issue.title)}', '${issue.status}')">
              <span>Manage</span>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">No open dispute tickets.</td></tr>';
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
  lucide.createIcons();
}

function openUpdateIssueModal(id, ref, title, status) {
  document.getElementById('update-issue-id').value = id;
  document.getElementById('update-issue-ref').textContent = ref;
  document.getElementById('update-issue-title').textContent = title;
  document.getElementById('update-issue-status').value = status;
  document.getElementById('update-issue-notes').value = '';
  openModal('modal-update-issue');
}

async function handleUpdateIssueSubmit(e) {
  e.preventDefault();
  const issueId = document.getElementById('update-issue-id').value;
  const status = document.getElementById('update-issue-status').value;
  const resolutionNotes = document.getElementById('update-issue-notes').value.trim();

  try {
    const res = await apiRequest(`/admin/issues/${issueId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolutionNotes })
    });

    if (res.success) {
      showToast('Dispute ticket updated successfully!', 'success');
      closeModal('modal-update-issue');
      loadAdminIssues();
    }
  } catch (err) {
    showToast(err.message || 'Failed to update dispute', 'error');
  }
}

// ============================================================================
// ADMIN: AUDIT LOGS TAB
// ============================================================================
async function loadAdminAuditLogs() {
  try {
    const res = await apiRequest('/admin/audit-logs?page=0&size=20');
    const tbody = document.getElementById('admin-audit-tbody');
    tbody.innerHTML = '';

    if (res.success && res.data && res.data.content && res.data.content.length > 0) {
      res.data.content.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-size:0.75rem;">${new Date(log.createdAt).toLocaleString()}</td>
          <td style="font-size:0.75rem;color:#ffffff;font-weight:500;">${log.userEmail || 'System'}</td>
          <td><span class="badge badge-info" style="font-size:0.65rem;">${log.activityType}</span></td>
          <td style="font-size:0.8rem;color:var(--text-secondary);">${log.activityDescription}</td>
          <td style="font-size:0.75rem;">${log.entityName || '—'}</td>
          <td><span class="badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}">${log.status}</span></td>
          <td class="font-mono text-muted" style="font-size:0.75rem;">${log.ipAddress || 'internal'}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">No audit events recorded.</td></tr>';
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
  lucide.createIcons();
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ============================================================================
// APPLICATION BOOTSTRAP
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  const token = localStorage.getItem('wallet_token');
  if (token) {
    initAppView();
  }
});
