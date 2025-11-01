// IITian Academy Milestone Tracker - Dashboard JavaScript

class MilestoneTracker {
    constructor() {
        this.data = {
            pages: [],
            summary: {},
            insights: {}
        };
        this.charts = {
            progress: null,
            status: null
        };
        this.isAdminMode = false;
        this.isAdminLoggedIn = false;
        this.adminToken = null;
        this.refreshInterval = null;
        this.countdownInterval = null;
        this.countdownTime = 30;
        
        this.init();
    }

    async init() {
        // Wait a moment to ensure DOM is fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        this.setupEventListeners();
        this.setupSecurity();
        this.startAutoRefresh();
        await this.loadData();
        this.updateCountdown();
    }

    setupSecurity() {
        // Prevent form autocomplete for sensitive fields
        const sensitiveFields = ['adminEmail', 'adminPassword'];
        sensitiveFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.setAttribute('autocomplete', 'off');
                field.setAttribute('data-lpignore', 'true'); // LastPass ignore
                
                // Clear field on page visibility change (security)
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden && !this.isAdminLoggedIn) {
                        field.value = '';
                    }
                });
            }
        });
        
        // Clear sensitive data on page unload
        window.addEventListener('beforeunload', () => {
            this.clearSensitiveData();
        });
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
            this.resetCountdown();
        });

        // Admin toggle (main button)
        document.getElementById('adminToggle').addEventListener('click', () => {
            this.toggleAdminPanel();
        });
        
        // Admin panel collapse/expand
        document.getElementById('adminPanelHeader').addEventListener('click', () => {
            this.toggleAdminPanelCollapse();
        });

        // Admin login form
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.adminLogin();
        });

        // Admin logout button
        document.getElementById('adminLogout').addEventListener('click', () => {
            this.adminLogout();
        });

        // Add page form
        document.getElementById('addPageForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPage();
        });

        // Update form
        document.getElementById('updateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePage();
        });

        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });
        document.getElementById('cancelUpdate').addEventListener('click', () => {
            this.closeModal();
        });

        // Search and filter
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterPages();
        });
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filterPages();
        });

        // Close modal on outside click
        document.getElementById('updateModal').addEventListener('click', (e) => {
            if (e.target.id === 'updateModal') {
                this.closeModal();
            }
        });
    }

    async loadData() {
        try {
            this.showLoading();
            
            // Load all data in parallel
            const [pagesResponse, summaryResponse, insightsResponse] = await Promise.all([
                fetch('/api/pages'),
                fetch('/api/progress'),
                fetch('/api/reminder')
            ]);

            if (pagesResponse.ok) {
                const pagesData = await pagesResponse.json();
                this.data.pages = pagesData.pages;
            }

            if (summaryResponse.ok) {
                this.data.summary = await summaryResponse.json();
            }

            if (insightsResponse.ok) {
                this.data.insights = await insightsResponse.json();
            }

            this.updateUI();
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast('Error loading data. Please try again.', 'error');
            this.hideLoading();
        }
    }

    updateUI() {
        this.updateSummary();
        this.updatePagesTable();
        this.updateCharts();
        this.updateInsights();
    }

    updateSummary() {
        try {
            const summary = this.data.summary || {};
            
            // Update counters safely
            this.safeUpdateElement('completedCount', summary.completed_questions || 0);
            this.safeUpdateElement('totalCount', summary.total_questions || 0);
            this.safeUpdateElement('progressPercent', `${summary.progress_percentage || 0}%`);
            this.safeUpdateElement('remainingDays', summary.days_remaining || 0);
            
            // Update new milestone and project info
            this.safeUpdateElement('projectName', summary.freelancer_project || 'IITian Academy Freelancer Project');
            this.safeUpdateElement('milestoneNumber', summary.milestone_number || 1);
            this.safeUpdateElement('milestoneAmount', summary.milestone_amount || 30);
            this.safeUpdateElement('allocatedQuestions', summary.allocated_questions || 290);
            this.safeUpdateElement('totalProjectQuestions', summary.total_questions || 480);
            this.safeUpdateElement('unallocatedQuestions', summary.unallocated_questions || 190);
            this.safeUpdateElement('createdDate', this.formatDate(summary.created_date) || '13 Oct 2025');
            this.safeUpdateElement('deadlineDate', this.formatDate(summary.deadline) || '17 Oct 2025');
            
            // Update payment status
            const paymentStatusEl = document.getElementById('paymentStatus');
            if (paymentStatusEl) {
                const status = summary.payment_status || 'Pending';
                paymentStatusEl.textContent = status;
                paymentStatusEl.className = `payment-status ${status.toLowerCase()}`;
            }

        // Update progress bar
        const progressFill = document.getElementById('mainProgressFill');
        const progressText = document.getElementById('progressText');
        const percentage = summary.progress_percentage || 0;
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${summary.completed_questions || 0} of ${summary.total_questions || 0} questions completed (${percentage}%)`;
        }

        // Update deadline elements (if they exist)
        const deadlineBadge = document.getElementById('deadlineBadge');
        const deadlineText = document.getElementById('deadlineText');
        const daysRemaining = summary.days_remaining || 0;
        
        if (deadlineText) {
            deadlineText.textContent = `${daysRemaining} days left`;
        }
        
        if (deadlineBadge) {
            // Reset classes
            deadlineBadge.className = 'deadline-badge';
            
            if (daysRemaining <= 1) {
                deadlineBadge.classList.add('deadline-critical');
            } else if (daysRemaining <= 3) {
                deadlineBadge.classList.add('deadline-warning');
            } else {
                deadlineBadge.classList.add('deadline-normal');
            }
        }
        } catch (error) {
            console.error('Error updating summary:', error);
        }
    }

    updatePagesTable() {
        const tbody = document.getElementById('pagesTableBody');
        
        if (!this.data.pages || this.data.pages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No pages found</td></tr>';
            return;
        }

        tbody.innerHTML = this.data.pages.map((page, index) => {
            const progressPercentage = page.progress_percentage || 0;
            const statusClass = this.getStatusClass(page.status);
            const completed = page.completed_questions || 0;
            const remaining = page.remaining_questions || (page.total_questions - completed);
            
            return `
                <tr data-page-id="${page._id}">
                    <td>${index + 1}</td>
                    <td>
                        ${page.page_link ? 
                            `<a href="${page.page_link}" target="_blank" class="page-link">${page.page_link}</a>` : 
                            'N/A'
                        }
                    </td>
                    <td>${page.total_questions}</td>
                    <td>${completed}</td>
                    <td>${remaining}</td>
                    <td>${page.subject || 'General'}</td>
                    <td>${page.year || 'N/A'}</td>
                    <td class="admin-only" style="display: ${this.isAdminLoggedIn ? 'table-cell' : 'none'};">
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-small" onclick="tracker.openUpdateModal('${page._id}')">
                                <i class="fas fa-edit"></i> Update
                            </button>
                            <button class="btn btn-danger btn-small" onclick="tracker.deletePage('${page._id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getStatusClass(status) {
        switch(status) {
            case 'Completed': return 'status-completed';
            case 'In Progress': return 'status-in-progress';
            case 'Pending': return 'status-pending';
            default: return 'status-pending';
        }
    }

    updateCharts() {
        // Add delay to ensure DOM elements are ready
        setTimeout(() => {
            this.updateProgressChart();
            this.updateStatusChart();
        }, 100);
    }

    updateProgressChart() {
        try {
            const progressCanvas = document.getElementById('progressChart');
            if (!progressCanvas) {
                console.warn('Progress chart canvas not found');
                return;
            }
            
            const ctx = progressCanvas.getContext('2d');
            const summary = this.data.summary || {};
            
            if (this.charts.progress) {
                this.charts.progress.destroy();
            }

            const completed = summary.completed_questions || 0;
            const remaining = summary.remaining_questions || 0;

            this.charts.progress = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'Remaining'],
                    datasets: [{
                        data: [completed, remaining],
                        backgroundColor: ['#27ae60', '#e9ecef'],
                        borderColor: ['#27ae60', '#dee2e6'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
            
        } catch (error) {
            console.error('Error updating progress chart:', error);
        }
    }

    updateStatusChart() {
        try {
            const statusCanvas = document.getElementById('statusChart');
            if (!statusCanvas) {
                console.warn('Status chart canvas not found');
                return;
            }
            
            const ctx = statusCanvas.getContext('2d');
            const summary = this.data.summary || {};
            
            if (this.charts.status) {
                this.charts.status.destroy();
            }

            const pending = summary.pending_pages || 0;
            const inProgress = summary.in_progress_pages || 0;
            const completed = summary.completed_pages || 0;

            // Ensure minimum height for visualization even with 0 values
            const chartData = [
                Math.max(pending, 0.1),
                Math.max(inProgress, 0.1), 
                Math.max(completed, 0.1)
            ];
            
            // Use actual values for labels
            const actualData = [pending, inProgress, completed];

            this.charts.status = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Pending', 'In Progress', 'Completed'],
                    datasets: [{
                        label: 'Pages',
                        data: chartData,
                        backgroundColor: ['#f39c12', '#3498db', '#27ae60'],
                        borderColor: ['#e67e22', '#2980b9', '#229954'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    // Show actual values in tooltip
                                    return `${context.label}: ${actualData[context.dataIndex]} pages`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                callback: function(value) {
                                    // Show actual integer values on Y-axis
                                    return Math.floor(value);
                                }
                            }
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('Error updating status chart:', error);
        }
    }

    updateInsights() {
        const insights = this.data.insights;
        
        if (!insights) return;

        document.getElementById('dailyAverage').textContent = 
            `${insights.average_daily_rate || 0} questions/day`;
        
        document.getElementById('estimatedCompletion').textContent = 
            insights.estimated_completion_date || 'Unknown';
        
        document.getElementById('performanceTrend').textContent = 
            insights.performance_trend || 'Unknown';

        const recommendation = document.getElementById('recommendation');
        recommendation.innerHTML = `
            <i class="fas fa-lightbulb"></i>
            <span>${insights.recommendation || 'No recommendations available'}</span>
        `;

        // Update recommendation color based on performance
        recommendation.className = 'recommendation';
        if (insights.performance_trend === 'Behind Schedule') {
            recommendation.style.background = 'linear-gradient(135deg, #ffeaea 0%, #fff0f0 100%)';
            recommendation.style.borderLeftColor = '#e74c3c';
        } else if (insights.performance_trend === 'Slightly Behind') {
            recommendation.style.background = 'linear-gradient(135deg, #fff8e1 0%, #fffbf0 100%)';
            recommendation.style.borderLeftColor = '#f39c12';
        }
    }

    toggleAdminMode() {
        this.isAdminMode = !this.isAdminMode;
        const adminPanel = document.getElementById('adminPanel');
        const adminColumns = document.querySelectorAll('.admin-only');
        const toggleBtn = document.getElementById('adminToggle');

        if (this.isAdminMode) {
            adminPanel.style.display = 'block';
            // Show login form initially if not logged in
            if (!this.isAdminLoggedIn) {
                document.getElementById('adminLoginCard').style.display = 'block';
                document.getElementById('adminDashboard').style.display = 'none';
            } else {
                document.getElementById('adminLoginCard').style.display = 'none';
                document.getElementById('adminDashboard').style.display = 'block';
                adminColumns.forEach(col => col.style.display = 'table-cell');
            }
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Public View';
            toggleBtn.classList.remove('btn-primary');
            toggleBtn.classList.add('btn-secondary');
        } else {
            adminPanel.style.display = 'none';
            adminColumns.forEach(col => col.style.display = 'none');
            toggleBtn.innerHTML = '<i class="fas fa-cog"></i> Admin Panel';
            toggleBtn.classList.remove('btn-secondary');
            toggleBtn.classList.add('btn-primary');
        }
    }

    async addPage() {
        const form = document.getElementById('addPageForm');
        const formData = new FormData(form);
        
        const pageData = {
            page_name: formData.get('pageName'),
            page_link: formData.get('pageLink') || null,
            total_questions: parseInt(formData.get('totalQuestions')),
            status: formData.get('status')
        };

        // Get API key from environment (we'll add an endpoint for this)
        const apiKey = await this.getAdminApiKey();
        
        if (!apiKey) {
            this.showToast('Unable to get admin API key', 'error');
            return;
        }

        try {
            const response = await fetch('/api/add_page', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                },
                body: JSON.stringify(pageData)
            });

            if (response.ok) {
                this.showToast('Page added successfully!', 'success');
                form.reset();
                await this.loadData();
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Failed to add page', 'error');
            }
        } catch (error) {
            console.error('Error adding page:', error);
            this.showToast('Error adding page. Please try again.', 'error');
        }
    }

    openUpdateModal(pageId) {
        const page = this.data.pages.find(p => p._id === pageId);
        if (!page) return;

        document.getElementById('updatePageId').value = pageId;
        document.getElementById('updatePageName').textContent = page.page_name;
        document.getElementById('updateCompleted').value = page.completed_questions;
        document.getElementById('updateCompleted').max = page.total_questions;
        document.getElementById('updateTotal').textContent = page.total_questions;
        document.getElementById('updateApiKey').value = '';
        
        document.getElementById('updateModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('updateModal').style.display = 'none';
    }

    async updatePage() {
        const pageId = document.getElementById('updatePageId').value;
        const completed = parseInt(document.getElementById('updateCompleted').value);
        
        // Check if admin is logged in
        if (!this.isAdminLoggedIn) {
            this.showToast('Please login as admin first', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/update_page/${pageId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify({
                    completed_questions: completed
                })
            });

            if (response.ok) {
                this.showToast('Page updated successfully!', 'success');
                this.closeModal();
                await this.loadData();
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Failed to update page', 'error');
            }
        } catch (error) {
            console.error('Error updating page:', error);
            this.showToast('Error updating page. Please try again.', 'error');
        }
    }

    async deletePage(pageId) {
        if (!confirm('Are you sure you want to delete this page? This action cannot be undone.')) {
            return;
        }

        const apiKey = prompt('Enter admin API key to confirm deletion:');
        if (!apiKey) return;

        try {
            const response = await fetch(`/api/page/${pageId}`, {
                method: 'DELETE',
                headers: {
                    'X-API-Key': apiKey
                }
            });

            if (response.ok) {
                this.showToast('Page deleted successfully!', 'success');
                await this.loadData();
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Failed to delete page', 'error');
            }
        } catch (error) {
            console.error('Error deleting page:', error);
            this.showToast('Error deleting page. Please try again.', 'error');
        }
    }

    filterPages() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        const rows = document.querySelectorAll('#pagesTableBody tr');

        rows.forEach(row => {
            if (row.querySelector('.text-center')) return; // Skip "no data" row
            
            const pageName = row.cells[0].textContent.toLowerCase();
            const status = row.cells[5].textContent.trim();
            
            const matchesSearch = pageName.includes(searchTerm);
            const matchesStatus = !statusFilter || status === statusFilter;
            
            row.style.display = matchesSearch && matchesStatus ? '' : 'none';
        });
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.loadData();
            this.resetCountdown();
        }, 30000); // 30 seconds
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    resetCountdown() {
        this.countdownTime = 30;
    }

    updateCountdown() {
        this.countdownInterval = setInterval(() => {
            this.countdownTime--;
            document.getElementById('refreshCountdown').textContent = `${this.countdownTime}s`;
            
            if (this.countdownTime <= 0) {
                this.countdownTime = 30;
            }
        }, 1000);
    }

    showLoading() {
        const tbody = document.getElementById('pagesTableBody');
        tbody.innerHTML = `
            <tr class="loading-row">
                <td colspan="7" class="text-center">
                    <i class="fas fa-spinner fa-spin"></i> Loading data...
                </td>
            </tr>
        `;
    }

    hideLoading() {
        // Loading will be replaced by actual data in updatePagesTable
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 
                    'exclamation-triangle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon} toast-icon"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }

    async adminLogin() {
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;

        if (!email || !password) {
            this.showToast('Please enter both email and password', 'error');
            return;
        }

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const result = await response.json();

            if (result.success) {
                this.isAdminLoggedIn = true;
                this.adminToken = result.token;
                
                // Hide login form and show admin dashboard
                document.getElementById('adminLoginCard').style.display = 'none';
                document.getElementById('adminDashboard').style.display = 'block';
                
                // Show admin columns in table
                const adminColumns = document.querySelectorAll('.admin-only');
                adminColumns.forEach(col => col.style.display = 'table-cell');
                
                // Clear form and secure it
                document.getElementById('adminLoginForm').reset();
                
                // Update login status indicator
                this.updateLoginStatus(true);
                
                this.showToast('Admin login successful! Welcome to admin panel.', 'success');
            } else {
                this.showToast(result.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Login failed due to network error', 'error');
        }
    }

    adminLogout() {
        this.isAdminLoggedIn = false;
        this.adminToken = null;
        
        // Hide admin dashboard and show login form
        document.getElementById('adminDashboard').style.display = 'none';
        document.getElementById('adminLoginCard').style.display = 'block';
        
        // Hide admin columns
        const adminColumns = document.querySelectorAll('.admin-only');
        adminColumns.forEach(col => col.style.display = 'none');
        
        // Clear any form data securely
        document.getElementById('adminEmail').value = '';
        document.getElementById('adminPassword').value = '';
        
        // Update login status indicator
        this.updateLoginStatus(false);
        
        this.showToast('Logged out successfully. Switched to public view.', 'info');
    }

    async getAdminApiKey() {
        try {
            const response = await fetch('/api/admin/api-key');
            if (response.ok) {
                const data = await response.json();
                return data.api_key;
            }
        } catch (error) {
            console.error('Error getting API key:', error);
        }
        return null;
    }

    updateLoginStatus(isAdmin) {
        const statusElement = document.getElementById('loginStatus').querySelector('.status-indicator');
        
        if (isAdmin) {
            statusElement.className = 'status-indicator admin';
            statusElement.innerHTML = '<i class="fas fa-user-shield"></i> Admin View';
        } else {
            statusElement.className = 'status-indicator public';
            statusElement.innerHTML = '<i class="fas fa-eye"></i> Public View';
        }
    }

    // Add security: Clear sensitive data from memory
    clearSensitiveData() {
        // Clear any potentially sensitive form data
        const sensitiveFields = ['adminEmail', 'adminPassword'];
        sensitiveFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
                field.setAttribute('autocomplete', 'off');
            }
        });
    }

    // Helper method to safely update DOM elements
    safeUpdateElement(elementId, content) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = content;
        } else {
            console.warn(`Element with ID '${elementId}' not found`);
        }
    }
}

// Initialize the tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tracker = new MilestoneTracker();
});

// Handle page visibility changes for auto-refresh
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (window.tracker) {
            window.tracker.stopAutoRefresh();
        }
    } else {
        if (window.tracker) {
            window.tracker.startAutoRefresh();
            window.tracker.loadData();
        }
    }
});
// Helper method to format dates
formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { 
        day: "2-digit", 
        month: "short", 
        year: "numeric" 
    });
}

toggleAdminPanel() {
    const panel = document.getElementById("adminPanel");
    if (panel.style.display === "none" || !panel.style.display) {
        panel.style.display = "block";
        panel.scrollIntoView({ behavior: "smooth" });
    } else {
        panel.style.display = "none";
    }
}

toggleAdminPanelCollapse() {
    const content = document.getElementById("adminPanelContent");
    const btn = document.getElementById("adminCollapseBtn");
    
    if (content && btn) {
        content.classList.toggle("collapsed");
        btn.classList.toggle("collapsed");
    }
}