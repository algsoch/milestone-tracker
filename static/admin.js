class AdminPanel {
    constructor() {
        this.token = localStorage.getItem('adminToken');
        this.milestones = [];
        this.pages = []; // Initialize pages array
        this.currentMilestone = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        
        // Check if already logged in
        if (this.token) {
            this.showAdminDashboard();
        } else {
            this.showLoginSection();
        }
    }

    bindEvents() {
        // Login form
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Create milestone button
        const createBtn = document.getElementById('createMilestoneBtn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.openMilestoneModal());
        }

        // Add page button
        const addPageBtn = document.getElementById('addPageBtn');
        if (addPageBtn) {
            addPageBtn.addEventListener('click', () => this.openPageModal());
        }

        // Modal events
        const modalClose = document.getElementById('modalClose');
        const cancelBtn = document.getElementById('cancelBtn');
        const milestoneForm = document.getElementById('milestoneForm');

        if (modalClose) modalClose.addEventListener('click', () => this.closeMilestoneModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeMilestoneModal());
        if (milestoneForm) milestoneForm.addEventListener('submit', (e) => this.handleMilestoneSubmit(e));

        // Page modal events
        const pageModalClose = document.getElementById('pageModalClose');
        const pageCancelBtn = document.getElementById('pageCancelBtn');
        const pageForm = document.getElementById('pageForm');

        if (pageModalClose) pageModalClose.addEventListener('click', () => this.closePageModal());
        if (pageCancelBtn) pageCancelBtn.addEventListener('click', () => this.closePageModal());
        if (pageForm) pageForm.addEventListener('submit', (e) => this.handlePageSubmit(e));

        // Close modal on outside click
        window.addEventListener('click', (e) => {
            const milestoneModal = document.getElementById('milestoneModal');
            const pageModal = document.getElementById('pageModal');
            if (e.target === milestoneModal) {
                this.closeMilestoneModal();
            }
            if (e.target === pageModal) {
                this.closePageModal();
            }
        });

        // Auto-calculate total questions allocated
        const startInput = document.getElementById('questionRangeStart');
        const endInput = document.getElementById('questionRangeEnd');
        const totalInput = document.getElementById('totalQuestionsAllocated');

        const calculateTotal = () => {
            const start = parseInt(startInput.value) || 0;
            const end = parseInt(endInput.value) || 0;
            if (start > 0 && end > 0 && end >= start) {
                totalInput.value = end - start + 1;
            } else {
                totalInput.value = '';
            }
        };

        if (startInput && endInput && totalInput) {
            startInput.addEventListener('input', calculateTotal);
            endInput.addEventListener('input', calculateTotal);
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const loginData = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData)
            });

            const result = await response.json();

            if (response.ok && result.success && result.token) {
                this.token = result.token;
                localStorage.setItem('adminToken', this.token);
                
                // Update admin info
                const adminUsername = document.getElementById('adminUsername');
                if (adminUsername) {
                    adminUsername.textContent = loginData.email.split('@')[0];
                }
                
                this.showAdminDashboard();
                this.loadMilestones();
                
                this.showNotification('Login successful!', 'success');
            } else {
                this.showNotification(result.message || result.detail || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please try again.', 'error');
        }
    }

    handleLogout() {
        this.token = null;
        localStorage.removeItem('adminToken');
        this.showLoginSection();
        this.showNotification('Logged out successfully', 'info');
    }

    showLoginSection() {
        document.getElementById('adminLoginSection').style.display = 'flex';
        document.getElementById('adminDashboardSection').style.display = 'none';
    }

    showAdminDashboard() {
        document.getElementById('adminLoginSection').style.display = 'none';
        document.getElementById('adminDashboardSection').style.display = 'block';
        
        // Load all data
        this.loadMilestones();
        this.loadQuestionPages();
        this.loadProgressData();
    }

    async loadMilestones() {
        if (!this.token) return;

        try {
            console.log('Loading milestones with token:', this.token.substring(0, 20) + '...');
            const response = await fetch('/api/milestones', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Milestones response:', data);
                
                // Handle both array and object responses
                this.milestones = Array.isArray(data) ? data : (data.milestones || []);
                console.log('Processed milestones:', this.milestones);
                
                this.renderMilestonesTable();
                this.updateStats();
                this.populateMilestoneFilter(); // Populate the filter dropdown
            } else {
                console.error('Failed to load milestones, status:', response.status);
                const errorText = await response.text();
                console.error('Error response:', errorText);
                this.showNotification('Failed to load milestones', 'error');
            }
        } catch (error) {
            console.error('Error loading milestones:', error);
            this.showNotification('Error loading milestones', 'error');
        }
    }

    populateMilestoneFilter() {
        const filterSelect = document.getElementById('milestoneFilter');
        if (!filterSelect) return;

        // Clear existing options except "All"
        filterSelect.innerHTML = '<option value="all">All Milestones (Combined)</option>';

        // Add each milestone as an option
        this.milestones.forEach((milestone, index) => {
            const option = document.createElement('option');
            option.value = milestone._id || milestone.id;
            const questionRange = `Q${milestone.start_question || 'N/A'}-${milestone.end_question || 'N/A'}`;
            option.textContent = `${milestone.title} (${questionRange})`;
            filterSelect.appendChild(option);
        });

        // Add change event listener
        filterSelect.removeEventListener('change', this.handleMilestoneFilterChange.bind(this));
        filterSelect.addEventListener('change', this.handleMilestoneFilterChange.bind(this));
    }

    handleMilestoneFilterChange() {
        const filterSelect = document.getElementById('milestoneFilter');
        const selectedMilestoneId = filterSelect.value;

        if (selectedMilestoneId === 'all') {
            this.updateStats(); // Show combined stats
        } else {
            this.updateStatsForMilestone(selectedMilestoneId);
        }
    }

    updateStatsForMilestone(milestoneId) {
        const milestone = this.milestones.find(m => (m._id || m.id) === milestoneId);
        if (!milestone) return;

        // Update stats to show milestone-specific data
        this.updateElement('totalMilestones', `1 of ${this.milestones.length}`);
        this.updateElement('milestoneTotalLabel', 'Selected Milestone');
        
        const completed = milestone.completed_questions || 0;
        this.updateElement('completedMilestones', completed);
        this.updateElement('completedLabel', 'Questions Completed');
        
        const remaining = milestone.total_questions - completed;
        this.updateElement('pendingMilestones', remaining);
        this.updateElement('pendingLabel', 'Questions Remaining');
        
        this.updateElement('totalAmount', `$${(milestone.amount || 0).toFixed(2)}`);
        this.updateElement('amountLabel', 'Milestone Amount');
        
        const progress = milestone.progress_percentage || 0;
        this.updateElement('progressPercentage', `${progress.toFixed(1)}%`);
        
        const paymentStatusEl = document.getElementById('paymentStatus');
        if (paymentStatusEl) {
            const status = milestone.payment_status || 'Pending';
            paymentStatusEl.textContent = status;
            paymentStatusEl.className = `payment-badge ${status.toLowerCase()}`;
        }
    }

    async loadQuestionPages() {
        if (!this.token) return;

        try {
            console.log('Loading question pages...');
            const response = await fetch('/api/pages', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Pages response:', data);
                
                // Handle both array and object responses
                const pages = Array.isArray(data) ? data : (data.pages || []);
                console.log('Processed pages:', pages);
                this.pages = pages; // Store pages for use by action functions
                this.renderPagesTable(pages);
            } else {
                console.error('Failed to load pages, status:', response.status);
                this.showNotification('Failed to load question pages', 'error');
            }
        } catch (error) {
            console.error('Error loading pages:', error);
            this.showNotification('Error loading question pages', 'error');
        }
    }

    async loadProgressData() {
        if (!this.token) return;

        try {
            console.log('Loading progress data...');
            const response = await fetch('/api/progress', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const progress = await response.json();
                console.log('Progress response:', progress);
                this.updateProgressCards(progress);
            } else {
                console.error('Failed to load progress, status:', response.status);
            }
        } catch (error) {
            console.error('Error loading progress:', error);
        }
    }

    renderPagesTable(pages) {
        const tbody = document.getElementById('pagesTableBody');
        if (!tbody) return;

        if (!pages || pages.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="no-data">
                        <i class="fas fa-inbox"></i>
                        <p>No question pages found.</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Calculate cumulative questions to determine milestone
        let cumulativeQuestions = 0;
        
        tbody.innerHTML = pages.map((page, index) => {
            const completedQuestions = page.completed_questions || page.completed || 0;
            const totalQuestions = page.total_questions || 0;
            const remainingQuestions = page.remaining_questions || (totalQuestions - completedQuestions);
            const progressPercentage = page.progress_percentage || (totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0);
            
            // Determine which milestone this page belongs to
            const questionEnd = cumulativeQuestions + totalQuestions;
            let milestoneNumber = 1;
            let milestoneColor = '#4a90e2';
            let milestoneBadge = 'M1';
            
            if (this.milestones && this.milestones.length > 0) {
                for (const milestone of this.milestones) {
                    const mStart = milestone.start_question || 0;
                    const mEnd = milestone.end_question || 0;
                    
                    // Check if this page falls within the milestone range
                    if (cumulativeQuestions < mEnd && questionEnd > mStart) {
                        milestoneNumber = this.milestones.indexOf(milestone) + 1;
                        milestoneBadge = `M${milestoneNumber}`;
                        
                        // Assign different colors to different milestones
                        const colors = ['#4a90e2', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'];
                        milestoneColor = colors[(milestoneNumber - 1) % colors.length];
                        break;
                    }
                }
            }
            
            cumulativeQuestions = questionEnd;
            
            let status = 'pending';
            let statusClass = 'pending';
            
            if (page.status) {
                // Use the actual status from the page
                status = page.status.toLowerCase();
                if (status === 'completed') statusClass = 'completed';
                else if (status === 'in progress' || completedQuestions > 0) statusClass = 'partial';
                else statusClass = 'pending';
            } else {
                // Fallback logic
                if (completedQuestions === totalQuestions && totalQuestions > 0) {
                    status = 'completed';
                    statusClass = 'completed';
                } else if (completedQuestions > 0) {
                    status = 'partial';
                    statusClass = 'partial';
                }
            }

            const pageId = page._id || page.id || index;
            
            // Add milestone background color (light version of the milestone color)
            const milestoneBackground = milestoneColor + '15'; // Add alpha for transparency

            return `
                <tr data-page-id="${pageId}" class="milestone-row" style="border-left: 5px solid ${milestoneColor}; background: ${milestoneBackground};">
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="milestone-badge" style="background: ${milestoneColor}; font-weight: 700; padding: 4px 10px; border-radius: 4px; color: white; font-size: 0.75rem;">${milestoneBadge}</span>
                            <span style="font-weight: 600;">${index + 1}</span>
                        </div>
                    </td>
                    <td>
                        <a href="${page.page_link || page.url}" target="_blank" class="page-link" title="${page.page_link || page.url}">
                            ${this.truncateUrl(page.page_link || page.url)}
                        </a>
                    </td>
                    <td><span class="total-questions">${totalQuestions}</span></td>
                    <td><span class="completed-questions">${completedQuestions}</span></td>
                    <td><span class="remaining-questions">${remainingQuestions}</span></td>
                    <td><span class="subject">${page.subject || 'N/A'}</span></td>
                    <td><span class="year">${page.year || 'N/A'}</span></td>
                    <td>
                        <span class="status ${statusClass}">
                            ${page.status || (status.charAt(0).toUpperCase() + status.slice(1))}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-primary" onclick="adminPanel.markAsCompleted('${pageId}')" title="Mark as Completed">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="adminPanel.editPageFromTable('${pageId}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="adminPanel.resetProgress('${pageId}')" title="Reset Progress">
                                <i class="fas fa-undo"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Add search functionality
        this.bindPageSearchEvents();
    }

    updateProgressCards(progress) {
        if (!progress) return;

        console.log('Updating progress cards with:', progress);

        // Update previous milestone progress if exists
        const previousMilestoneCard = document.getElementById('previousMilestoneCard');
        const previousMilestoneInfo = document.getElementById('previousMilestoneInfo');
        const previousMilestoneProgressFill = document.getElementById('previousMilestoneProgressFill');
        const previousMilestoneProgressText = document.getElementById('previousMilestoneProgressText');

        if (progress.previous_milestone_exists) {
            // Show previous milestone card
            if (previousMilestoneCard) {
                previousMilestoneCard.style.display = 'block';
            }

            if (previousMilestoneInfo) {
                const prevTitle = progress.previous_milestone_title || 'Previous Milestone';
                const prevStart = progress.previous_milestone_start || 1;
                const prevEnd = progress.previous_milestone_end || 0;
                previousMilestoneInfo.querySelector('h3').textContent = 
                    `✅ ${prevTitle}: Questions ${prevStart}-${prevEnd}`;
            }

            if (previousMilestoneProgressFill) {
                const prevProgress = progress.previous_milestone_progress || 0;
                previousMilestoneProgressFill.style.width = `${prevProgress}%`;
            }

            if (previousMilestoneProgressText) {
                const prevCompleted = progress.previous_milestone_completed || 0;
                const prevTotal = progress.previous_milestone_total || 0;
                const prevPercent = progress.previous_milestone_progress || 0;
                const prevStatus = progress.previous_milestone_payment_status || 'Pending';
                previousMilestoneProgressText.textContent = 
                    `✓ Completed: ${prevCompleted}/${prevTotal} questions (${prevPercent.toFixed(1)}%) - Payment: ${prevStatus}`;
            }
        } else {
            // Hide previous milestone card if doesn't exist
            if (previousMilestoneCard) {
                previousMilestoneCard.style.display = 'none';
            }
        }

        // Update current milestone progress
        const milestoneProgressInfo = document.getElementById('milestoneProgressInfo');
        const milestoneProgressFill = document.getElementById('milestoneProgressFill');
        const milestoneProgressText = document.getElementById('milestoneProgressText');

        if (milestoneProgressInfo) {
            const milestoneTitle = progress.current_milestone_title || 'Milestone 1';
            const milestoneStart = progress.current_milestone_start || 1;
            const milestoneEnd = progress.current_milestone_end || progress.total_questions;
            milestoneProgressInfo.querySelector('h3').textContent = 
                `⏳ ${milestoneTitle}: Questions ${milestoneStart}-${milestoneEnd}`;
        }

        if (milestoneProgressFill) {
            const milestoneProgress = progress.allocated_progress_percentage || 0;
            milestoneProgressFill.style.width = `${milestoneProgress}%`;
        }

        if (milestoneProgressText) {
            milestoneProgressText.textContent = 
                `📈 Current Progress: ${progress.completed_questions}/${progress.total_questions} questions (${(progress.allocated_progress_percentage || 0).toFixed(1)}%)`;
        }

        // Update overall progress
        const overallProgressFill = document.getElementById('overallProgressFill');
        const overallProgressText = document.getElementById('overallProgressText');

        if (overallProgressFill) {
            const overallProgress = progress.overall_progress_percentage || 0;
            overallProgressFill.style.width = `${overallProgress}%`;
        }

        if (overallProgressText) {
            const overallCompleted = progress.overall_completed || progress.completed_questions;
            const overallTotal = progress.overall_total || progress.total_questions;
            const overallPercent = progress.overall_progress_percentage || progress.progress_percentage || 0;
            overallProgressText.textContent = 
                `🎯 All Milestones: ${overallCompleted}/${overallTotal} questions (${overallPercent.toFixed(1)}%)`;
        }
    }

    bindPageSearchEvents() {
        const searchInput = document.getElementById('pagesSearch');
        const statusFilter = document.getElementById('statusFilter');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterPages());
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterPages());
        }
    }

    filterPages() {
        const searchTerm = document.getElementById('pagesSearch')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const rows = document.querySelectorAll('#pagesTableBody tr');

        rows.forEach(row => {
            if (row.querySelector('.no-data')) return;

            const text = row.textContent.toLowerCase();
            const statusCell = row.querySelector('.status');
            const status = statusCell ? statusCell.textContent.toLowerCase() : '';

            const matchesSearch = text.includes(searchTerm);
            const matchesStatus = !statusFilter || status.includes(statusFilter);

            row.style.display = matchesSearch && matchesStatus ? '' : 'none';
        });
    }

    truncateUrl(url) {
        if (url.length > 50) {
            return url.substring(0, 47) + '...';
        }
        return url;
    }

    // Action handlers for pages
    async markAsCompleted(pageId) {
        try {
            const page = this.pages.find(p => (p._id || p.id) === pageId);
            if (!page) {
                this.showNotification('Page not found', 'error');
                return;
            }

            // Create update data without _id field (MongoDB doesn't allow updating _id)
            const updateData = {
                page_name: page.page_name,
                page_link: page.page_link || page.url,
                total_questions: page.total_questions,
                completed_questions: page.total_questions, // Mark all as completed
                subject: page.subject,
                year: page.year,
                status: "Completed"
            };

            const response = await fetch(`/api/pages/${pageId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                await this.loadQuestionPages();
                await this.loadProgressData();
                this.showNotification('Page marked as completed successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.detail || 'Failed to mark page as completed', 'error');
            }
        } catch (error) {
            console.error('Error marking page as completed:', error);
            this.showNotification('Error marking page as completed: ' + error.message, 'error');
        }
    }

    async editPage(pageId) {
        try {
            const page = this.pages.find(p => (p._id || p.id) === pageId);
            if (page) {
                this.openPageModal(page);
            }
        } catch (error) {
            console.error('Error editing page:', error);
            this.showNotification('Error opening edit page modal', 'error');
        }
    }

    async resetProgress(pageId) {
        try {
            const page = this.pages.find(p => (p._id || p.id) === pageId);
            if (!page) {
                this.showNotification('Page not found', 'error');
                return;
            }

            // Create update data without _id field (MongoDB doesn't allow updating _id)
            const updateData = {
                page_name: page.page_name,
                page_link: page.page_link || page.url,
                total_questions: page.total_questions,
                completed_questions: 0, // Reset to 0
                subject: page.subject,
                year: page.year,
                status: "Pending"
            };

            const response = await fetch(`/api/pages/${pageId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                await this.loadQuestionPages();
                await this.loadProgressData();
                this.showNotification('Page progress reset successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.detail || 'Failed to reset page progress', 'error');
            }
        } catch (error) {
            console.error('Error resetting page progress:', error);
            this.showNotification('Error resetting page progress: ' + error.message, 'error');
        }
    }

    async deletePage(pageId) {
        try {
            const page = this.pages.find(p => (p._id || p.id) === pageId);
            if (!page) return;

            const confirmDelete = confirm(`Are you sure you want to delete "${page.page_name || page.page_link}"?\n\nThis action cannot be undone.`);
            if (!confirmDelete) return;

            const response = await fetch(`/api/pages/${pageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.loadQuestionPages();
                this.loadProgressData(); // Reload progress after deletion
                this.showNotification('Page deleted successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.detail || 'Failed to delete page', 'error');
            }
        } catch (error) {
            console.error('Error deleting page:', error);
            this.showNotification('Error deleting page: ' + error.message, 'error');
        }
    }

    // Page Management Functions
    openPageModal(page = null) {
        this.currentPage = page;
        const modal = document.getElementById('pageModal');
        const modalTitle = document.getElementById('pageModalTitle');
        const form = document.getElementById('pageForm');

        if (page) {
            modalTitle.textContent = 'Edit Page';
            this.populatePageForm(page);
        } else {
            modalTitle.textContent = 'Add New Page';
            form.reset();
            document.getElementById('pageId').value = '';
        }

        // Add event listeners for auto-completion logic
        this.setupAutoCompletion();

        modal.style.display = 'flex';
    }

    setupAutoCompletion() {
        const totalQuestionsField = document.getElementById('totalQuestions');
        const completedQuestionsField = document.getElementById('completedQuestions');
        const statusField = document.getElementById('pageStatus');
        const pageUrlField = document.getElementById('pageLink');
        const pageNameField = document.getElementById('pageName');
        const subjectField = document.getElementById('subject');
        const yearField = document.getElementById('year');

        // Auto-update status based on completion
        const updateStatus = () => {
            const total = parseInt(totalQuestionsField.value) || 0;
            const completed = parseInt(completedQuestionsField.value) || 0;
            
            if (completed >= total && total > 0) {
                statusField.value = 'Completed';
            } else if (completed > 0) {
                statusField.value = 'In Progress';
            } else {
                statusField.value = 'Pending';
            }
        };

        // Auto-populate fields from URL
        const extractFromUrl = () => {
            const url = pageUrlField.value;
            if (!url) return;

            // Auto-set page name if empty
            if (!pageNameField.value) {
                const urlParts = url.split('/');
                const lastPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
                if (lastPart) {
                    pageNameField.value = lastPart.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                }
            }

            // Auto-set subject if empty
            if (!subjectField.value || subjectField.value === '') {
                const urlLower = url.toLowerCase();
                if (urlLower.includes('chemistry')) {
                    subjectField.value = 'Chemistry';
                } else if (urlLower.includes('physics')) {
                    subjectField.value = 'Physics';
                } else if (urlLower.includes('math')) {
                    subjectField.value = 'Maths';
                } else if (urlLower.includes('ap_stats') || urlLower.includes('stats')) {
                    subjectField.value = 'AP Stats';
                } else if (urlLower.includes('biology')) {
                    subjectField.value = 'Biology';
                } else {
                    subjectField.value = 'Other';
                }
            }

            // Auto-set year if empty or N/A
            if (!yearField.value || yearField.value === 'N/A') {
                // Match years from 2000-2029 (20[0-2][0-9])
                const yearMatch = url.match(/(20[0-2][0-9])/);
                if (yearMatch) {
                    yearField.value = yearMatch[1];
                }
            }
        };

        // Remove previous event listeners to avoid duplicates
        totalQuestionsField.removeEventListener('input', updateStatus);
        completedQuestionsField.removeEventListener('input', updateStatus);
        pageUrlField.removeEventListener('blur', extractFromUrl);

        // Add event listeners
        totalQuestionsField.addEventListener('input', updateStatus);
        completedQuestionsField.addEventListener('input', updateStatus);
        pageUrlField.addEventListener('blur', extractFromUrl);
    }

    closePageModal() {
        const modal = document.getElementById('pageModal');
        modal.style.display = 'none';
        this.currentPage = null;
    }

    populatePageForm(page) {
        const pageId = page._id || page.id;
        document.getElementById('pageId').value = pageId;
        document.getElementById('pageName').value = page.page_name || '';
        document.getElementById('pageLink').value = page.page_link || page.url || '';
        document.getElementById('totalQuestions').value = page.total_questions || '';
        document.getElementById('completedQuestions').value = page.completed_questions || page.completed || 0;
        document.getElementById('subject').value = page.subject || '';
        
        // Auto-extract year from URL if not present
        let year = page.year;
        if (!year || year === 'N/A') {
            const url = page.page_link || page.url || '';
            const yearMatch = url.match(/(20[0-2][0-9])/);
            if (yearMatch) {
                year = yearMatch[1];
            }
        }
        document.getElementById('year').value = year || '';
        
        document.getElementById('pageStatus').value = page.status || 'Pending';
    }

    async handlePageSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const pageData = {
            page_name: formData.get('page_name'),
            page_link: formData.get('page_link'),
            total_questions: parseInt(formData.get('total_questions')),
            completed_questions: parseInt(formData.get('completed_questions') || 0),
            subject: formData.get('subject'),
            year: parseInt(formData.get('year')),
            status: formData.get('status')
        };

        console.log('Submitting page data:', pageData);

        try {
            if (!this.token) {
                this.showNotification('Please login first', 'error');
                return;
            }

            const pageId = formData.get('id');
            const isEdit = pageId && pageId !== '';

            const url = isEdit ? `/api/pages/${pageId}` : '/api/pages';
            const method = isEdit ? 'PUT' : 'POST';

            console.log(`Making ${method} request to ${url}`);

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(pageData)
            });

            console.log('Page save response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('Page save result:', result);
                this.closePageModal();
                this.loadQuestionPages(); // Reload pages
                this.loadProgressData(); // Reload progress after page changes
                this.showNotification(`Page ${isEdit ? 'updated' : 'added'} successfully!`, 'success');
            } else {
                const error = await response.json();
                console.error('Page save error:', error);
                this.showNotification(error.detail || error.message || `Failed to ${isEdit ? 'update' : 'add'} page`, 'error');
            }
        } catch (error) {
            console.error('Error saving page:', error);
            this.showNotification('Error saving page: ' + error.message, 'error');
        }
    }

    async editPageFromTable(pageId) {
        // Find the page in the current pages data and edit it
        const pagesTableBody = document.getElementById('pagesTableBody');
        const rows = pagesTableBody.querySelectorAll('tr[data-page-id]');
        
        for (let row of rows) {
            if (row.getAttribute('data-page-id') === pageId) {
                // Extract data from the row for editing
                const pageData = {
                    _id: pageId,
                    page_name: row.cells[1].textContent.trim(),
                    url: row.cells[1].querySelector('a').href,
                    total_questions: parseInt(row.cells[2].textContent),
                    completed: parseInt(row.cells[3].textContent),
                    subject: row.cells[5].textContent,
                    year: row.cells[6].textContent,
                    status: row.cells[7].textContent.trim()
                };
                
                this.openPageModal(pageData);
                return;
            }
        }
        
        this.showNotification('Page not found for editing', 'error');
    }

    renderMilestonesTable() {
        const tbody = document.getElementById('milestonesTableBody');
        if (!tbody) return;

        if (this.milestones.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="no-data">
                        <i class="fas fa-inbox"></i>
                        <p>No milestones found. Create your first milestone!</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.milestones.map(milestone => {
            const milestoneId = milestone._id || milestone.id;
            const progressPercentage = milestone.progress_percentage || 0;
            const questionRange = `${milestone.question_range_start}-${milestone.question_range_end}`;
            const totalQuestions = milestone.question_range_end - milestone.question_range_start + 1;
            const completedQuestions = Math.floor((progressPercentage / 100) * totalQuestions);
            const remainingQuestions = totalQuestions - completedQuestions;
            
            return `
            <tr data-milestone-id="${milestoneId}">
                <td>
                    <div class="milestone-id-cell">
                        <span class="milestone-id">${milestoneId.substring(0, 8)}...</span>
                    </div>
                </td>
                <td>
                    <div class="milestone-title-cell">
                        <strong>${milestone.title}</strong>
                        ${milestone.description ? `<small>${milestone.description}</small>` : ''}
                    </div>
                </td>
                <td>
                    <div class="question-range-cell">
                        <span class="question-range">${questionRange}</span>
                        <small>Total: ${totalQuestions} questions</small>
                    </div>
                </td>
                <td>
                    <span class="amount">$${milestone.amount}</span>
                </td>
                <td>
                    <span class="payment-status ${milestone.payment_status.toLowerCase()}">
                        ${milestone.payment_status}
                    </span>
                </td>
                <td>
                    <div class="progress-cell">
                        <div class="mini-progress-bar">
                            <div class="mini-progress-fill" style="width: ${progressPercentage}%"></div>
                        </div>
                        <span class="progress-text">${progressPercentage.toFixed(1)}%</span>
                        <small>${completedQuestions}/${totalQuestions} completed</small>
                    </div>
                </td>
                <td>
                    <span class="deadline">${this.formatDate(milestone.deadline)}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary" onclick="adminPanel.editMilestone('${milestoneId}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <div class="payment-status-dropdown">
                            <select onchange="adminPanel.updatePaymentStatus('${milestoneId}', this.value)" class="status-select ${milestone.payment_status.toLowerCase()}">
                                <option value="Pending" ${milestone.payment_status === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Paid" ${milestone.payment_status === 'Paid' ? 'selected' : ''}>Paid</option>
                                <option value="Free" ${milestone.payment_status === 'Free' ? 'selected' : ''}>Free</option>
                                <option value="Cancelled" ${milestone.payment_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                                <option value="Refunded" ${milestone.payment_status === 'Refunded' ? 'selected' : ''}>Refunded</option>
                            </select>
                        </div>
                        <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteMilestone('${milestoneId}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
        
        // Also render mobile cards
        this.renderMobileCards();
    }

    renderMobileCards() {
        // Create mobile cards container if it doesn't exist
        let mobileContainer = document.querySelector('.mobile-cards');
        if (!mobileContainer) {
            mobileContainer = document.createElement('div');
            mobileContainer.className = 'mobile-cards';
            const tableContainer = document.querySelector('.milestones-table-container');
            if (tableContainer) {
                tableContainer.appendChild(mobileContainer);
            }
        }

        if (!this.milestones || this.milestones.length === 0) {
            mobileContainer.innerHTML = `
                <div class="mobile-card">
                    <div class="mobile-card-header">
                        <div class="mobile-card-title">
                            <strong>No milestones found</strong>
                            <small>Create your first milestone!</small>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        mobileContainer.innerHTML = this.milestones.map(milestone => {
            const milestoneId = milestone._id || milestone.id;
            const progressPercentage = milestone.progress_percentage || 0;
            const questionRange = `${milestone.question_range_start}-${milestone.question_range_end}`;
            const totalQuestions = milestone.question_range_end - milestone.question_range_start + 1;
            const completedQuestions = Math.floor((progressPercentage / 100) * totalQuestions);
            
            return `
                <div class="mobile-card" data-milestone-id="${milestoneId}">
                    <div class="mobile-card-header">
                        <div class="mobile-card-title">
                            <strong>${milestone.title}</strong>
                            ${milestone.description ? `<small>${milestone.description}</small>` : ''}
                        </div>
                        <div class="mobile-card-actions">
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-secondary" onclick="adminPanel.editMilestone('${milestoneId}')" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteMilestone('${milestoneId}')" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="mobile-card-body">
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">Questions Range</span>
                            <span class="mobile-card-value">${questionRange}</span>
                            <small style="color: var(--medium-gray);">Total: ${totalQuestions} questions</small>
                        </div>
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">Amount</span>
                            <span class="mobile-card-value">$${milestone.amount}</span>
                        </div>
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">Payment Status</span>
                            <span class="mobile-card-value payment-status ${milestone.payment_status.toLowerCase()}">${milestone.payment_status}</span>
                        </div>
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">Progress</span>
                            <span class="mobile-card-value">${progressPercentage.toFixed(1)}%</span>
                            <div class="mobile-progress-bar">
                                <div class="mobile-progress-fill" style="width: ${progressPercentage}%"></div>
                            </div>
                            <small style="color: var(--medium-gray);">${completedQuestions}/${totalQuestions} completed</small>
                        </div>
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">Deadline</span>
                            <span class="mobile-card-value">${this.formatDate(milestone.deadline)}</span>
                        </div>
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">ID</span>
                            <span class="mobile-card-value" style="font-family: 'Courier New', monospace; font-size: 0.8em;">${milestoneId.substring(0, 8)}...</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateStats() {
        const totalMilestones = this.milestones.length;
        
        // Count by payment status instead of progress
        const paidMilestones = this.milestones.filter(m => 
            (m.payment_status || '').toLowerCase() === 'paid'
        ).length;
        const pendingPayment = this.milestones.filter(m => 
            (m.payment_status || '').toLowerCase() === 'pending'
        ).length;
        
        const totalAmount = this.milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
        
        // Calculate total completed and remaining questions across all milestones
        const totalCompleted = this.milestones.reduce((sum, m) => sum + (m.completed_questions || 0), 0);
        const totalQuestions = this.milestones.reduce((sum, m) => sum + (m.total_questions || 0), 0);
        const totalRemaining = totalQuestions - totalCompleted;
        const avgProgress = totalQuestions > 0 ? (totalCompleted / totalQuestions * 100) : 0;

        // Reset labels to combined view
        this.updateElement('milestoneTotalLabel', 'Total Milestones');
        this.updateElement('completedLabel', 'Questions Completed');
        this.updateElement('pendingLabel', 'Questions Remaining');
        this.updateElement('amountLabel', 'Total Amount');
        
        // Update values
        this.updateElement('totalMilestones', totalMilestones);
        this.updateElement('completedMilestones', totalCompleted);
        this.updateElement('pendingMilestones', totalRemaining);
        this.updateElement('totalAmount', `$${totalAmount.toFixed(2)}`);
        this.updateElement('progressPercentage', `${avgProgress.toFixed(1)}%`);
        
        const paymentStatusEl = document.getElementById('paymentStatus');
        if (paymentStatusEl) {
            paymentStatusEl.textContent = `${paidMilestones} Paid / ${pendingPayment} Pending`;
            paymentStatusEl.className = 'payment-badge combined';
        }
    }

    openMilestoneModal(milestone = null) {
        this.currentMilestone = milestone;
        const modal = document.getElementById('milestoneModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('milestoneForm');

        if (milestone) {
            modalTitle.textContent = 'Edit Milestone';
            this.populateForm(milestone);
        } else {
            modalTitle.textContent = 'Create New Milestone';
            form.reset();
            document.getElementById('milestoneId').value = '';
        }

        modal.style.display = 'flex';
    }

    closeMilestoneModal() {
        const modal = document.getElementById('milestoneModal');
        modal.style.display = 'none';
        this.currentMilestone = null;
    }

    populateForm(milestone) {
        const milestoneId = milestone._id || milestone.id;
        document.getElementById('milestoneId').value = milestoneId;
        document.getElementById('milestoneTitle').value = milestone.title;
        document.getElementById('milestoneDescription').value = milestone.description || '';
        document.getElementById('totalQuestionsInMilestone').value = milestone.total_questions || 480;
        document.getElementById('milestoneAmount').value = milestone.amount;
        document.getElementById('paymentStatus').value = milestone.payment_status;
        document.getElementById('deadline').value = milestone.deadline.split('T')[0];
    }

    async handleMilestoneSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const milestoneData = {
            title: formData.get('title'),
            description: formData.get('description'),
            total_questions: parseInt(formData.get('total_questions')),
            amount: parseFloat(formData.get('amount')),
            payment_status: formData.get('payment_status'),
            deadline: formData.get('deadline')
        };

        console.log('Submitting milestone data:', milestoneData);

        try {
            if (!this.token) {
                this.showNotification('Please login first', 'error');
                return;
            }

            const milestoneId = formData.get('id');
            const isEdit = milestoneId && milestoneId !== '';
            
            const url = isEdit ? `/api/milestones/${milestoneId}` : '/api/milestones';
            const method = isEdit ? 'PUT' : 'POST';

            console.log(`Making ${method} request to ${url}`);

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(milestoneData)
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('Milestone save result:', result);
                this.closeMilestoneModal();
                this.loadMilestones();
                this.loadProgressData(); // Reload progress after milestone changes
                this.showNotification(`Milestone ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
            } else {
                const error = await response.json();
                console.error('Milestone save error:', error);
                this.showNotification(error.detail || error.message || `Failed to ${isEdit ? 'update' : 'create'} milestone`, 'error');
            }
        } catch (error) {
            console.error('Error saving milestone:', error);
            this.showNotification('Error saving milestone: ' + error.message, 'error');
        }
    }

    async editMilestone(milestoneId) {
        const milestone = this.milestones.find(m => (m._id || m.id) === milestoneId);
        if (milestone) {
            this.openMilestoneModal(milestone);
        }
    }

    async updatePaymentStatus(milestoneId, newStatus) {
        const milestone = this.milestones.find(m => (m._id || m.id) === milestoneId);
        if (!milestone) return;

        try {
            console.log(`Updating payment status for milestone ${milestoneId} to ${newStatus}`);
            
            // Send as query parameter
            const response = await fetch(`/api/milestones/${milestoneId}/payment-status?payment_status=${encodeURIComponent(newStatus)}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            console.log('Payment status update response:', response.status);

            if (response.ok) {
                this.loadMilestones();
                this.loadProgressData(); // Reload progress after payment update
                this.showNotification(`Payment status updated to ${newStatus}`, 'success');
            } else {
                const error = await response.json();
                console.error('Payment status update error:', error);
                this.showNotification(error.detail || 'Failed to update payment status', 'error');
            }
        } catch (error) {
            console.error('Error updating payment status:', error);
            this.showNotification('Error updating payment status: ' + error.message, 'error');
        }
    }

    async deleteMilestone(milestoneId) {
        if (!confirm('Are you sure you want to delete this milestone? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/milestones/${milestoneId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                this.loadMilestones();
                this.showNotification('Milestone deleted successfully!', 'success');
            } else {
                this.showNotification('Failed to delete milestone', 'error');
            }
        } catch (error) {
            console.error('Error deleting milestone:', error);
            this.showNotification('Error deleting milestone', 'error');
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'Not set';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove notification after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 4000);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }
}

// Mobile Menu Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const navActions = document.getElementById('adminNavActions');
    
    if (hamburgerMenu && navActions) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'nav-overlay';
        document.body.appendChild(overlay);
        
        // Toggle menu
        hamburgerMenu.addEventListener('click', function() {
            hamburgerMenu.classList.toggle('active');
            navActions.classList.toggle('active');
            overlay.classList.toggle('active');
            document.body.style.overflow = navActions.classList.contains('active') ? 'hidden' : '';
        });
        
        // Close menu when clicking overlay
        overlay.addEventListener('click', function() {
            hamburgerMenu.classList.remove('active');
            navActions.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        // Close menu when clicking a nav link
        const navLinks = navActions.querySelectorAll('.btn, a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburgerMenu.classList.remove('active');
                navActions.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
});

// Initialize admin panel when page loads
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});