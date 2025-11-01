// IITian Academy Milestone Tracker - Dashboard JavaScript

class MilestoneTracker {
    constructor() {
        this.data = {
            pages: [],
            summary: {},
            insights: {},
            milestones: [],
            progressData: null
        };
        this.charts = {
            progress: null,
            status: null,
            milestone: null,
            subject: null,
            timeline: null
        };
        this.isAdminMode = false;
        this.isAdminLoggedIn = false;
        this.adminToken = null;
        this.refreshInterval = null;
        this.countdownInterval = null;
        this.countdownTime = 30;
        this.currentMilestone = null;
        this.selectedMilestoneFilter = 'all';
        this.milestoneColors = [
            '#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'
        ];
        this.darkMode = localStorage.getItem('darkMode') === 'true';
        this.autoRefreshEnabled = true;
        this.lastUpdateTime = new Date();
        
        this.init();
    }

    async init() {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.initDarkMode();
        this.setupHamburgerMenu();
        this.setupEventListeners();
        this.setupAdvancedFeatures();
        this.setupSecurity();
        this.checkAdminStatus();
        this.startAutoRefresh();
        await this.loadData();
        this.updateCountdown();
    }

    setupHamburgerMenu() {
        const hamburger = document.getElementById('headerHamburger');
        const controls = document.getElementById('headerControls');
        
        if (!hamburger || !controls) return;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'nav-overlay';
        overlay.id = 'headerNavOverlay';
        document.body.appendChild(overlay);
        
        // Toggle menu
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            controls.classList.toggle('active');
            overlay.classList.toggle('active');
            document.body.style.overflow = hamburger.classList.contains('active') ? 'hidden' : '';
        });
        
        // Close on overlay click
        overlay.addEventListener('click', () => {
            hamburger.classList.remove('active');
            controls.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        // Close on link click
        controls.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', () => {
                hamburger.classList.remove('active');
                controls.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    checkAdminStatus() {
        // Check if admin token exists in localStorage
        const adminToken = localStorage.getItem('adminToken');
        if (adminToken) {
            this.adminToken = adminToken;
            this.isAdminLoggedIn = true;
            this.isAdminMode = true;
            console.log('Admin already logged in, enabling admin features');
            // Show admin columns in table
            this.showAdminColumns();
        }
    }

    showAdminColumns() {
        const adminColumns = document.querySelectorAll('.admin-only');
        adminColumns.forEach(col => {
            col.style.display = this.isAdminLoggedIn ? 'table-cell' : 'none';
        });
    }

    setupSecurity() {
        const sensitiveFields = ['adminEmail', 'adminPassword'];
        sensitiveFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.setAttribute('autocomplete', 'off');
                field.setAttribute('data-lpignore', 'true');
                
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden && !this.isAdminLoggedIn) {
                        field.value = '';
                    }
                });
            }
        });
        
        window.addEventListener('beforeunload', () => {
            this.clearSensitiveData();
        });
    }

    setupEventListeners() {
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
            this.resetCountdown();
        });

        document.getElementById('adminToggle').addEventListener('click', () => {
            window.location.href = '/admin';
        });
        
        // Milestone filter dropdown
        const milestoneFilter = document.getElementById('milestoneFilter');
        if (milestoneFilter) {
            milestoneFilter.addEventListener('change', (e) => {
                this.selectedMilestoneFilter = e.target.value;
                this.updatePagesTable();
                this.updateMilestoneStats();
            });
        }
        
        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.updatePagesTable();
            });
        }
        
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.updatePagesTable();
            });
        }
        
        // Removed unused admin panel event listeners for better performance

        const addPageForm = document.getElementById('addPageForm');
        if (addPageForm) {
            addPageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addPage();
            });
        }

        const updateForm = document.getElementById('updateForm');
        if (updateForm) {
            updateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updatePage();
            });
        }

        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.closeModal();
            });
        }

        const cancelUpdate = document.getElementById('cancelUpdate');
        if (cancelUpdate) {
            cancelUpdate.addEventListener('click', () => {
                this.closeModal();
            });
        }

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('updateModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Milestone event listeners
        const addMilestoneBtn = document.getElementById('addMilestoneBtn');
        if (addMilestoneBtn) {
            addMilestoneBtn.addEventListener('click', () => this.openMilestoneModal());
        }

        // Pivot table event listeners
        const generatePivotBtn = document.getElementById('generatePivotBtn');
        if (generatePivotBtn) {
            generatePivotBtn.addEventListener('click', () => this.generatePivotTable());
        }

        const milestoneForm = document.getElementById('milestoneForm');
        if (milestoneForm) {
            milestoneForm.addEventListener('submit', (e) => this.handleMilestoneSubmit(e));
        }

        const closeMilestoneModal = document.getElementById('closeMilestoneModal');
        if (closeMilestoneModal) {
            closeMilestoneModal.addEventListener('click', () => this.closeMilestoneModal());
        }

        const cancelMilestone = document.getElementById('cancelMilestone');
        if (cancelMilestone) {
            cancelMilestone.addEventListener('click', () => this.closeMilestoneModal());
        }
    }

    async loadData() {
        this.showLoading();
        
        try {
            const [pagesResponse, progressResponse, reminderResponse, milestonesResponse] = await Promise.all([
                fetch('/api/pages'),
                fetch('/api/progress'),
                fetch('/api/reminder'),
                fetch('/api/public/milestones')  // Use public endpoint
            ]);

            if (pagesResponse.ok && progressResponse.ok && reminderResponse.ok) {
                const pagesData = await pagesResponse.json();
                this.data.pages = pagesData.pages || [];
                this.data.progressData = await progressResponse.json();
                this.data.summary = this.data.progressData; // Keep for backwards compatibility
                this.data.insights = await reminderResponse.json();
                
                if (milestonesResponse.ok) {
                    const milestonesData = await milestonesResponse.json();
                    // API returns {value: [...], Count: X} format
                    this.data.milestones = milestonesData.value || milestonesData.milestones || [];
                    console.log('Loaded milestones:', this.data.milestones.length);
                    console.log('Milestones data:', this.data.milestones);
                } else {
                    console.error('Failed to load milestones:', milestonesResponse.status);
                }
                
                console.log('Loaded pages:', this.data.pages.length);
                console.log('Progress data:', this.data.progressData);
                
                this.populateMilestoneFilter();
                this.updateUI();
            } else {
                throw new Error('Failed to load data');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast('Failed to load data. Please refresh the page.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadMilestones() {
        try {
            const response = await fetch('/api/milestones');
            if (response.ok) {
                const data = await response.json();
                this.data.milestones = data.milestones || [];
                this.updateMilestonesDisplay();
            }
        } catch (error) {
            console.error('Error loading milestones:', error);
        }
    }

    updateUI() {
        this.updateProgressCards();
        this.updatePagesTable();
        this.updateMilestoneStats();
        this.updateCharts();
        this.updateInsights();
        this.renderTimeline();
        this.updateQuickStats();
        this.renderAdvancedCharts();
        this.updateEnhancedInsights();
        this.checkMilestoneCompletion();
        this.lastUpdateTime = new Date();
        this.updateLastUpdated();
    }
    
    populateMilestoneFilter() {
        const filterSelect = document.getElementById('milestoneFilter');
        if (!filterSelect) {
            console.error('Milestone filter select not found!');
            return;
        }
        
        if (!this.data.milestones) {
            console.error('Milestones data is null/undefined!');
            return;
        }
        
        console.log('Populating milestone filter with', this.data.milestones.length, 'milestones');
        
        // Keep "All Milestones" option and add individual milestones
        const milestonesOptions = this.data.milestones.map((m, index) => {
            console.log(`Milestone ${index + 1}:`, m.title, m._id);
            return `<option value="${m._id}">Milestone ${index + 1}: ${m.title}</option>`;
        }).join('');
        
        filterSelect.innerHTML = `
            <option value="all">All Milestones (Combined)</option>
            ${milestonesOptions}
        `;
        
        console.log('Milestone filter populated with HTML:', filterSelect.innerHTML);
    }
    
    updateProgressCards() {
        const progressData = this.data.progressData || {};
        
        console.log('Progress Data:', progressData); // Debug log
        
        // Update Previous Milestone Card
        const prevCard = document.getElementById('previousMilestoneCard');
        if (progressData.previous_milestone_exists && progressData.previous_milestone_title && prevCard) {
            prevCard.style.display = 'block';
            document.getElementById('prevMilestoneName').textContent = progressData.previous_milestone_title;
            document.getElementById('prevMilestoneQuestions').textContent = 
                `${progressData.previous_milestone_completed || 0} / ${progressData.previous_milestone_total || 0}`;
            document.getElementById('prevMilestoneAmount').textContent = 
                `$${progressData.previous_milestone_amount || 0}`;
            document.getElementById('prevMilestonePayment').textContent = progressData.previous_milestone_payment_status || 'Paid';
            document.getElementById('prevMilestonePayment').className = 
                `payment-status-badge ${(progressData.previous_milestone_payment_status || 'paid').toLowerCase()}`;
            document.getElementById('prevMilestoneRange').textContent = 
                `Questions ${progressData.previous_milestone_start || 1}-${progressData.previous_milestone_end || 0}`;
            
            // Update previous milestone progress bar
            const prevProgress = progressData.previous_milestone_progress || 0;
            document.getElementById('prevMilestoneProgress').style.width = `${prevProgress}%`;
        } else if (prevCard) {
            prevCard.style.display = 'none';
        }
        
        // Update Current Milestone Card
        const currentMilestoneTotal = progressData.current_milestone_end - progressData.current_milestone_start + 1;
        const currentMilestoneCompleted = progressData.completed_questions || 0;
        const currentProgress = progressData.allocated_progress_percentage || 0;
        
        document.getElementById('currentMilestoneName').textContent = 
            progressData.current_milestone_title || 'Current Milestone';
        document.getElementById('currentMilestoneQuestions').textContent = 
            `${currentMilestoneCompleted} / ${currentMilestoneTotal}`;
        document.getElementById('currentMilestoneAmount').textContent = 
            `$${progressData.milestone_amount || 0}`;
        
        const deadline = progressData.deadline ? 
            new Date(progressData.deadline).toLocaleDateString() : '-';
        document.getElementById('currentMilestoneDeadline').textContent = deadline;
        
        document.getElementById('currentMilestoneProgress').style.width = `${currentProgress}%`;
        document.getElementById('currentMilestoneRange').textContent = 
            `Questions ${progressData.current_milestone_start || 1}-${progressData.current_milestone_end || 0}`;
        document.getElementById('currentMilestonePercentage').textContent = `${currentProgress.toFixed(1)}% Complete`;
        
        // Update badge based on progress
        const badge = document.getElementById('currentMilestoneBadge');
        if (currentProgress >= 100) {
            badge.textContent = 'Completed';
            badge.className = 'milestone-badge completed';
        } else if (currentProgress > 0) {
            badge.textContent = 'In Progress';
            badge.className = 'milestone-badge active';
        } else {
            badge.textContent = 'Not Started';
            badge.className = 'milestone-badge pending';
        }
        
        // Update Overall Progress Card (use overall stats, not current milestone)
        const totalCompleted = progressData.overall_completed || 0;
        const totalQuestions = progressData.overall_total || 0;
        const overallProgress = progressData.overall_progress_percentage || 0;
        
        document.getElementById('overallCompleted').textContent = totalCompleted;
        document.getElementById('overallTotal').textContent = totalQuestions;
        document.getElementById('overallRemaining').textContent = totalQuestions - totalCompleted;
        document.getElementById('overallProgress').style.width = `${overallProgress}%`;
        document.getElementById('overallPercentage').textContent = `${overallProgress.toFixed(1)}% Complete`;
        
        // Update motivational message
        const infoEl = document.getElementById('overallInfo');
        if (overallProgress >= 100) {
            infoEl.textContent = '🎉 Project Complete! Excellent work!';
        } else if (overallProgress >= 75) {
            infoEl.textContent = '🚀 Almost there! Final push!';
        } else if (overallProgress >= 50) {
            infoEl.textContent = '💪 Halfway done! Keep it up!';
        } else if (overallProgress >= 25) {
            infoEl.textContent = '⭐ Great progress! Stay focused!';
        } else {
            infoEl.textContent = '🎯 Let\'s get started! You got this!';
        }
    }
    
    updateMilestoneStats() {
        console.log('updateMilestoneStats called');
        console.log('Pages count:', this.data.pages ? this.data.pages.length : 0);
        console.log('Selected filter:', this.selectedMilestoneFilter);
        
        let filteredPages = this.data.pages || [];
        
        // Filter by selected milestone
        if (this.selectedMilestoneFilter && this.selectedMilestoneFilter !== 'all') {
            const milestone = this.data.milestones.find(m => m._id === this.selectedMilestoneFilter);
            if (milestone) {
                let cumulativeQuestions = 0;
                filteredPages = this.data.pages.filter(page => {
                    const pageStart = cumulativeQuestions + 1;
                    const pageEnd = cumulativeQuestions + (page.total_questions || 0);
                    cumulativeQuestions = pageEnd;
                    
                    // Page overlaps with milestone if it starts before milestone ends AND ends after milestone starts
                    return pageStart <= milestone.end_question && pageEnd >= milestone.start_question;
                });
            }
        }
        
        const totalPages = filteredPages.length;
        const totalQuestions = filteredPages.reduce((sum, p) => sum + (p.total_questions || 0), 0);
        const completedQuestions = filteredPages.reduce((sum, p) => sum + (p.completed_questions || 0), 0);
        const progress = totalQuestions > 0 ? ((completedQuestions / totalQuestions) * 100).toFixed(1) : 0;
        
        console.log('Stats:', { totalPages, totalQuestions, completedQuestions, progress });
        
        const filterTotalPages = document.getElementById('filterTotalPages');
        const filterTotalQuestions = document.getElementById('filterTotalQuestions');
        const filterCompletedQuestions = document.getElementById('filterCompletedQuestions');
        const filterProgressPercent = document.getElementById('filterProgressPercent');
        
        if (filterTotalPages) filterTotalPages.textContent = totalPages;
        if (filterTotalQuestions) filterTotalQuestions.textContent = totalQuestions;
        if (filterCompletedQuestions) filterCompletedQuestions.textContent = completedQuestions;
        if (filterProgressPercent) filterProgressPercent.textContent = `${progress}%`;
    }

    updateSummary() {
        try {
            const summary = this.data.summary || {};
            
            this.safeUpdateElement('completedCount', summary.completed_questions || 0);
            this.safeUpdateElement('totalCount', summary.total_questions || 0);
            this.safeUpdateElement('progressPercent', `${summary.progress_percentage || 0}%`);
            this.safeUpdateElement('remainingDays', summary.days_remaining || 0);
            
            this.safeUpdateElement('projectName', summary.freelancer_project || 'IITian Academy Freelancer Project');
            this.safeUpdateElement('milestoneNumber', summary.milestone_number || 1);
            this.safeUpdateElement('milestoneAmount', summary.milestone_amount || 30);
            this.safeUpdateElement('questionRangeStart', 1);
            this.safeUpdateElement('questionRangeEnd', summary.allocated_questions || 290);
            this.safeUpdateElement('totalProjectQuestions', summary.total_questions || 480);
            this.safeUpdateElement('createdDate', this.formatDate(summary.created_date) || '13 Oct 2025');
            this.safeUpdateElement('deadlineDate', this.formatDate(summary.deadline) || '17 Oct 2025');
            
            // Update milestone info header
            const milestoneInfoHeader = document.getElementById('milestoneInfoHeader');
            if (milestoneInfoHeader) {
                const startRange = 1;
                const endRange = summary.allocated_questions || 290;
                const totalQuestions = summary.total_questions || 480;
                const completedQuestions = summary.completed_questions || 0;
                const progressPercentage = summary.progress_percentage || 0;
                
                let headerContent = '';
                
                if (endRange > totalQuestions) {
                    // When milestone crosses total questions
                    const statusIcon = progressPercentage >= 100 ? '✅' : progressPercentage >= 50 ? '🚀' : '⏳';
                    headerContent = `
                        <div class="milestone-range">${statusIcon} Current Milestone: ${startRange}-${endRange} questions</div>
                        <div class="milestone-separator"></div>
                        <div class="milestone-summary">
                            <div class="summary-item">📊 Total Project: ${totalQuestions} questions</div>
                            <div class="summary-item">✔️ Completed: ${completedQuestions} questions (${progressPercentage.toFixed(1)}%)</div>
                            <div class="summary-item">⚡ Remaining: ${Math.max(0, totalQuestions - completedQuestions)} questions</div>
                        </div>
                    `;
                } else {
                    // Normal milestone display
                    const statusIcon = progressPercentage >= 100 ? '✅' : progressPercentage >= 75 ? '🚀' : progressPercentage >= 25 ? '⏳' : '🎯';
                    const milestoneCompleted = completedQuestions >= endRange ? completedQuestions : Math.min(completedQuestions, endRange);
                    const milestoneProgress = ((milestoneCompleted / endRange) * 100).toFixed(1);
                    
                    headerContent = `
                        <div class="milestone-range">${statusIcon} Milestone Questions: ${startRange}-${endRange} of ${totalQuestions} Total</div>
                        <div class="milestone-separator"></div>
                        <div class="milestone-progress">
                            <div class="progress-stats">📈 Milestone Progress: ${milestoneCompleted}/${endRange} questions (${milestoneProgress}%)</div>
                            <div class="overall-progress">🎯 Overall Progress: ${completedQuestions}/${totalQuestions} questions (${progressPercentage.toFixed(1)}%)</div>
                        </div>
                    `;
                }
                
                milestoneInfoHeader.innerHTML = headerContent;
            }
            
            const paymentStatusEl = document.getElementById('paymentStatus');
            if (paymentStatusEl) {
                const status = summary.payment_status || 'Pending';
                paymentStatusEl.textContent = status;
                paymentStatusEl.className = `payment-status ${status.toLowerCase()}`;
            }

            const progressFill = document.getElementById('mainProgressFill');
            const progressText = document.getElementById('progressText');
            const percentage = summary.progress_percentage || 0;
            
            if (progressFill) {
                progressFill.style.width = `${percentage}%`;
            }
            
            if (progressText) {
                progressText.textContent = `${summary.completed_questions || 0} of ${summary.total_questions || 0} questions completed (${percentage}%)`;
            }

            const deadlineBadge = document.getElementById('deadlineBadge');
            const deadlineText = document.getElementById('deadlineText');
            const daysRemaining = summary.days_remaining || 0;
            
            if (deadlineText) {
                deadlineText.textContent = `${daysRemaining} days left`;
            }
            
            if (deadlineBadge) {
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

    safeUpdateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    updatePagesTable() {
        const tbody = document.getElementById('pagesTableBody');
        const tfoot = document.getElementById('pagesTableFooter');
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        
        if (!this.data.pages || this.data.pages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center">No pages found</td></tr>';
            if (tfoot) tfoot.innerHTML = '';
            return;
        }

        // Apply filters
        let filteredPages = [...this.data.pages];
        
        // Sort pages by creation date (oldest first) or by ID if no date
        filteredPages.sort((a, b) => {
            // Try sorting by created_at timestamp
            if (a.created_at && b.created_at) {
                return new Date(a.created_at) - new Date(b.created_at);
            }
            // Fallback: sort by _id (MongoDB ObjectId contains timestamp)
            if (a._id && b._id) {
                return a._id.localeCompare(b._id);
            }
            return 0;
        });
        
        // Search filter
        if (searchInput && searchInput.value.trim()) {
            const searchTerm = searchInput.value.toLowerCase();
            filteredPages = filteredPages.filter(page => {
                const pageName = (page.page_name || this.extractPageNameFromUrl(page.page_link) || '').toLowerCase();
                const pageLink = (page.page_link || '').toLowerCase();
                const subject = (page.subject || '').toLowerCase();
                return pageName.includes(searchTerm) || pageLink.includes(searchTerm) || subject.includes(searchTerm);
            });
        }
        
        // Status filter
        if (statusFilter && statusFilter.value) {
            filteredPages = filteredPages.filter(page => page.status === statusFilter.value);
        }
        
        // Calculate cumulative questions and assign milestone colors
        let cumulativeQuestions = 0;
        const pagesWithCumulative = filteredPages.map((page, index) => {
            const pageTotal = page.total_questions || 0;
            const pageStart = cumulativeQuestions + 1;
            cumulativeQuestions += pageTotal;
            const pageEnd = cumulativeQuestions;
            
            // Determine which milestone this page belongs to
            // Assign page to milestone where it ENDS (where cumulative lands)
            let milestoneIndex = -1;
            let milestone = null;
            
            if (this.data.milestones && this.data.milestones.length > 0) {
                for (let i = 0; i < this.data.milestones.length; i++) {
                    const m = this.data.milestones[i];
                    const msStart = m.question_range_start || 1;
                    const msEnd = m.question_range_end || 0;
                    
                    // Page belongs to milestone if its END (cumulative) falls within milestone range
                    if (pageEnd >= msStart && pageEnd <= msEnd) {
                        milestoneIndex = i;
                        milestone = m;
                        break;
                    }
                }
            }
            
            return {
                ...page,
                cumulative: cumulativeQuestions,
                pageStart,
                pageEnd,
                milestoneIndex,
                milestone,
                originalIndex: index
            };
        });
        
        // Filter by selected milestone
        let displayPages = pagesWithCumulative;
        if (this.selectedMilestoneFilter && this.selectedMilestoneFilter !== 'all') {
            const selectedMilestone = this.data.milestones.find(m => m._id === this.selectedMilestoneFilter);
            if (selectedMilestone) {
                const msStart = selectedMilestone.question_range_start || selectedMilestone.start_question || 1;
                const msEnd = selectedMilestone.question_range_end || selectedMilestone.end_question || 0;
                displayPages = pagesWithCumulative.filter(page => {
                    const pageStart = (page.cumulative - (page.total_questions || 0)) + 1;
                    const pageEnd = page.cumulative;
                    return pageStart <= msEnd && pageEnd >= msStart;
                });
            }
        }
        
        if (displayPages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center">No pages match your filters</td></tr>';
            if (tfoot) tfoot.innerHTML = '';
            return;
        }

        tbody.innerHTML = displayPages.map((page, displayIndex) => {
            const completed = page.completed_questions || 0;
            const remaining = (page.total_questions || 0) - completed;
            const pageName = page.page_name || this.extractPageNameFromUrl(page.page_link) || 'Untitled Page';
            const milestoneColor = page.milestoneIndex >= 0 ? this.milestoneColors[page.milestoneIndex % this.milestoneColors.length] : '#9E9E9E';
            const milestoneBadge = page.milestoneIndex >= 0 ? `M${page.milestoneIndex + 1}` : 'N/A';
            const backgroundColor = page.milestoneIndex >= 0 ? `${milestoneColor}15` : 'transparent';
            
            // Check if this cumulative marks a milestone completion (480, 960, etc.)
            const isMilestoneComplete = page.milestone && page.cumulative === (page.milestone.question_range_end || page.milestone.end_question);
            const milestoneProgress = page.milestone ? 
                Math.round((page.milestone.completed_questions / page.milestone.total_questions) * 100) : 0;
            
            // Special styling for milestone completion row
            let rowClass = '';
            let milestoneIndicator = '';
            let cumulativeCellContent = `<strong>${page.cumulative}</strong>`;
            
            if (isMilestoneComplete) {
                rowClass = 'milestone-complete-row';
                const isFullyCompleted = milestoneProgress === 100;
                
                if (isFullyCompleted) {
                    milestoneIndicator = `
                        <div class="milestone-achievement">
                            <span class="achievement-badge pulse">
                                <i class="fas fa-trophy"></i> Milestone ${page.milestoneIndex + 1} Complete!
                            </span>
                            <span class="achievement-stars">✨🎉✨</span>
                        </div>
                    `;
                    cumulativeCellContent = `
                        <div class="cumulative-milestone-marker completed">
                            <div class="marker-icon"><i class="fas fa-check-circle"></i></div>
                            <strong>${page.cumulative}</strong>
                            <div class="marker-label">🎯 Target Reached!</div>
                        </div>
                    `;
                } else {
                    milestoneIndicator = `
                        <div class="milestone-achievement partial">
                            <span class="achievement-badge">
                                <i class="fas fa-flag-checkered"></i> Milestone ${page.milestoneIndex + 1} Boundary
                            </span>
                            <span class="achievement-progress">${milestoneProgress}% Complete</span>
                        </div>
                    `;
                    cumulativeCellContent = `
                        <div class="cumulative-milestone-marker partial">
                            <div class="marker-icon"><i class="fas fa-flag"></i></div>
                            <strong>${page.cumulative}</strong>
                            <div class="marker-label">🎯 Milestone ${page.milestoneIndex + 1}</div>
                        </div>
                    `;
                }
            }
            
            // Enhanced completed cell with progress indicator
            let completedCellContent = completed;
            if (page.total_questions > 0) {
                const pageProgress = Math.round((completed / page.total_questions) * 100);
                let progressColor = '#e74c3c';
                if (pageProgress === 100) progressColor = '#27ae60';
                else if (pageProgress >= 75) progressColor = '#2ecc71';
                else if (pageProgress >= 50) progressColor = '#f39c12';
                else if (pageProgress >= 25) progressColor = '#3498db';
                
                completedCellContent = `
                    <div class="progress-cell-container">
                        <span class="progress-number" style="color: ${progressColor};">${completed}</span>
                        ${pageProgress === 100 ? '<i class="fas fa-check-circle" style="color: #27ae60; margin-left: 5px;"></i>' : ''}
                        <div class="mini-progress-bar" style="--progress: ${pageProgress}%; --color: ${progressColor};"></div>
                    </div>
                `;
            }
            
            return `
                <tr data-page-id="${page._id}" class="${rowClass}" style="border-left: 5px solid ${milestoneColor}; background-color: ${backgroundColor};">
                    <td>${displayIndex + 1}</td>
                    <td>
                        <span class="milestone-badge-inline" style="background-color: ${milestoneColor};">${milestoneBadge}</span>
                    </td>
                    <td class="page-name-cell">
                        ${pageName}
                        ${milestoneIndicator}
                    </td>
                    <td class="page-link-cell">
                        ${page.page_link ? 
                            `<div class="link-container">
                                <a href="${page.page_link}" target="_blank" class="page-link" title="Open in new tab">${this.truncateUrl(page.page_link)}</a>
                                <button class="copy-btn btn btn-sm" onclick="tracker.copyToClipboard('${page.page_link}')" title="Copy URL">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>` : 
                            'N/A'
                        }
                    </td>
                    <td><strong>${page.total_questions || 0}</strong></td>
                    <td class="completed-cell">${completedCellContent}</td>
                    <td class="remaining-cell">${remaining}</td>
                    <td class="cumulative-cell">${cumulativeCellContent}</td>
                    <td>${page.subject || 'General'}</td>
                    <td>${page.year || 'N/A'}</td>
                    <td class="admin-only" style="display: ${this.isAdminLoggedIn ? 'table-cell' : 'none'};">
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-small" onclick="tracker.openUpdateModal('${page._id}')" title="Update Progress">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger btn-small" onclick="tracker.deletePage('${page._id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // ========== MULTI-MILESTONE FOOTER SYSTEM ==========
        // Calculate total questions from ALL pages
        const totalQuestionsFromPages = displayPages.reduce((sum, p) => sum + (p.total_questions || 0), 0);
        
        // Build multi-milestone footer rows
        let milestoneRows = '';
        
        if (this.data.milestones && this.data.milestones.length > 0) {
            // Sort milestones by their range start (should already be sorted, but just in case)
            const sortedMilestones = [...this.data.milestones].sort((a, b) => 
                (a.question_range_start || 0) - (b.question_range_start || 0)
            );
            
            sortedMilestones.forEach((milestone, index) => {
                const rangeStart = milestone.question_range_start || 0;
                const rangeEnd = milestone.question_range_end || 0;
                const milestoneTotal = rangeEnd - rangeStart + 1;
                
                // Calculate how many questions fall within THIS milestone's range
                let questionsInThisMilestone = 0;
                let cumulativeQuestions = 0;
                
                for (const page of displayPages) {
                    const pageTotal = page.total_questions || 0;
                    const pageCompleted = page.completed_questions || 0;
                    
                    // Calculate cumulative position for this page
                    const pageStart = cumulativeQuestions + 1;
                    const pageEnd = cumulativeQuestions + pageTotal;
                    
                    // Check if this page overlaps with current milestone range
                    if (pageEnd >= rangeStart && pageStart <= rangeEnd) {
                        // Calculate overlap
                        const overlapStart = Math.max(pageStart, rangeStart);
                        const overlapEnd = Math.min(pageEnd, rangeEnd);
                        const overlapTotal = overlapEnd - overlapStart + 1;
                        
                        // Calculate completed questions in overlap
                        const pageProgress = pageTotal > 0 ? pageCompleted / pageTotal : 0;
                        const overlapCompleted = Math.floor(overlapTotal * pageProgress);
                        
                        questionsInThisMilestone += overlapCompleted;
                    }
                    
                    cumulativeQuestions += pageTotal;
                }
                
                // Calculate milestone progress
                const msProgress = milestoneTotal > 0 ? Math.round((questionsInThisMilestone / milestoneTotal) * 100) : 0;
                const msRemaining = milestoneTotal - questionsInThisMilestone;
                
                // Determine milestone state
                let msState = '';
                let msIcon = '';
                let msBadgeClass = '';
                let msMessage = '';
                let msColor = '#e74c3c';
                
                if (msProgress === 100) {
                    // COMPLETE
                    msState = 'COMPLETE!';
                    msIcon = '🏆';
                    msBadgeClass = 'complete';
                    msMessage = `Fully Achieved`;
                    msColor = '#27ae60';
                } else if (msProgress === 0) {
                    // READY TO START
                    msState = 'READY TO START';
                    msIcon = '🎬';
                    msBadgeClass = 'notstarted';
                    msMessage = `Start Milestone ${index + 1} (${milestoneTotal} questions)`;
                    msColor = '#95a5a6';
                } else if (msProgress < 25) {
                    // GETTING STARTED
                    msState = `GETTING STARTED (${msProgress}%)`;
                    msIcon = '🚀';
                    msBadgeClass = 'starting';
                    msMessage = `${questionsInThisMilestone}/${milestoneTotal} • ${msRemaining} remaining`;
                    msColor = '#3498db';
                } else if (msProgress < 50) {
                    // IN PROGRESS
                    msState = `IN PROGRESS (${msProgress}%)`;
                    msIcon = '✅';
                    msBadgeClass = 'working';
                    msMessage = `${questionsInThisMilestone}/${milestoneTotal} • Keep going!`;
                    msColor = '#f39c12';
                } else if (msProgress < 75) {
                    // HALFWAY THERE
                    msState = `HALFWAY THERE! (${msProgress}%)`;
                    msIcon = '⭐';
                    msBadgeClass = 'halfway';
                    msMessage = `${questionsInThisMilestone}/${milestoneTotal} • Almost there!`;
                    msColor = '#f39c12';
                } else {
                    // ALMOST DONE
                    msState = `ALMOST DONE! (${msProgress}%)`;
                    msIcon = '🏁';
                    msBadgeClass = 'almost';
                    msMessage = `${questionsInThisMilestone}/${milestoneTotal} • Just ${msRemaining} left!`;
                    msColor = '#2ecc71';
                }
                
                // Build milestone row
                milestoneRows += `
                    <tr class="milestone-totals-row ${msBadgeClass}">
                        <td colspan="2" class="milestone-title-cell">
                            <div class="ms-title-section">
                                <div class="ms-main-title">
                                    <span class="ms-badge ${msBadgeClass}">${msIcon} M${index + 1}: ${msState}</span>
                                </div>
                                <div class="ms-subtitle">${milestone.title || `Milestone ${index + 1}`}</div>
                            </div>
                        </td>
                        <td colspan="2" class="ms-progress-col">
                            <div class="milestone-progress-info">
                                <div class="progress-label">Milestone ${index + 1} Progress</div>
                                <div class="compact-progress-bar milestone-specific">
                                    <div class="compact-progress-fill" style="width: ${msProgress}%; background: ${msColor};">
                                        <span>${msProgress}%</span>
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td class="ms-stat-total"><i class="fas fa-bullseye"></i> ${milestoneTotal}</td>
                        <td class="ms-stat-completed" style="color: ${msColor};"><i class="fas fa-check-circle"></i> ${questionsInThisMilestone}</td>
                        <td class="ms-stat-remaining" style="color: ${msRemaining > 0 ? '#e74c3c' : '#27ae60'};"><i class="fas fa-hourglass-half"></i> ${msRemaining}</td>
                        <td class="ms-stat-range"><small>${rangeStart}-${rangeEnd}</small></td>
                        <td colspan="3" class="ms-message">
                            <small><i class="fas fa-info-circle"></i> ${msMessage}</small>
                        </td>
                    </tr>
                `;
            });
        }
        
        // Overall totals row (summary of everything)
        const totalCompleted = displayPages.reduce((sum, p) => sum + (p.completed_questions || 0), 0);
        const totalRemaining = totalQuestionsFromPages - totalCompleted;
        const finalCumulative = displayPages[displayPages.length - 1]?.cumulative || 0;
        const overallProgress = totalQuestionsFromPages > 0 ? Math.round((totalCompleted / totalQuestionsFromPages) * 100) : 0;
        
        let overallColor = '#e74c3c';
        if (overallProgress === 100) overallColor = '#27ae60';
        else if (overallProgress >= 75) overallColor = '#2ecc71';
        else if (overallProgress >= 50) overallColor = '#f39c12';
        else if (overallProgress >= 25) overallColor = '#3498db';
        
        if (tfoot) {
            tfoot.innerHTML = `
                ${milestoneRows}
                <tr class="totals-row-compact overall-summary">
                    <td colspan="2" class="totals-title">
                        <div class="title-section">
                            <div class="main-title"><i class="fas fa-calculator"></i> <strong>OVERALL TOTALS</strong></div>
                            <div class="overall-subtitle">All Milestones Combined</div>
                        </div>
                    </td>
                    <td colspan="2" class="progress-col">
                        <div class="milestone-progress-info">
                            <div class="progress-label">Overall Progress</div>
                            <div class="compact-progress-bar">
                                <div class="compact-progress-fill" style="width: ${overallProgress}%; background: ${overallColor};">
                                    <span>${overallProgress}%</span>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="stat-total"><i class="fas fa-list"></i> <strong>${totalQuestionsFromPages}</strong></td>
                    <td class="stat-completed" style="color: ${overallColor};"><i class="fas fa-check"></i> <strong>${totalCompleted}</strong></td>
                    <td class="stat-remaining" style="color: #e74c3c;"><i class="fas fa-clock"></i> <strong>${totalRemaining}</strong></td>
                    <td class="stat-cumulative"><i class="fas fa-layer-group"></i> <strong>${finalCumulative}</strong></td>
                    <td colspan="3" class="stats-summary">
                        <small><i class="fas fa-check-circle"></i> ${totalCompleted}/${totalQuestionsFromPages} • ${overallProgress}%</small>
                    </td>
                </tr>
            `;
        }
        
        this.showAdminColumns();
    }

    renderQuestionPagesMobileCards() {
        // Create mobile cards container if it doesn't exist
        let mobileContainer = document.querySelector('.table-container .mobile-cards');
        if (!mobileContainer) {
            mobileContainer = document.createElement('div');
            mobileContainer.className = 'mobile-cards';
            const tableContainer = document.querySelector('.table-container');
            if (tableContainer) {
                tableContainer.appendChild(mobileContainer);
            }
        }

        if (!this.data.pages || this.data.pages.length === 0) {
            mobileContainer.innerHTML = `
                <div class="mobile-card">
                    <div class="mobile-card-header">
                        <div class="mobile-card-title">
                            <strong>No question pages found</strong>
                            <small>Add your first question page!</small>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        mobileContainer.innerHTML = this.data.pages.map((page, index) => {
            const progressPercentage = page.progress_percentage || 0;
            const completed = page.completed_questions || 0;
            const remaining = page.remaining_questions || (page.total_questions - completed);
            const statusClass = this.getStatusClass(page.status);
            
            return `
                <div class="mobile-card" data-page-id="${page._id}">
                    <div class="mobile-card-header">
                        <div class="mobile-card-title">
                            <strong>Page #${index + 1}</strong>
                            ${page.page_link ? `<small><a href="${page.page_link}" target="_blank" class="page-link">${page.page_link}</a></small>` : ''}
                        </div>
                        ${this.isAdminLoggedIn ? `
                        <div class="mobile-card-actions">
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-primary" onclick="tracker.openUpdateModal('${page._id}')" title="Update">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="tracker.deletePage('${page._id}')" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    <div class="mobile-card-body">
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">Total Questions</span>
                            <span class="mobile-card-value">${page.total_questions}</span>
                        </div>
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">Completed</span>
                            <span class="mobile-card-value" style="color: var(--success-color); font-weight: bold;">${completed}</span>
                        </div>
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">Remaining</span>
                            <span class="mobile-card-value" style="color: var(--warning-color); font-weight: bold;">${remaining}</span>
                        </div>
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">Subject</span>
                            <span class="mobile-card-value">${page.subject || 'General'}</span>
                        </div>
                        <div class="mobile-card-field">
                            <span class="mobile-card-label">Year</span>
                            <span class="mobile-card-value">${page.year || 'N/A'}</span>
                        </div>
                        <div class="mobile-card-field" style="grid-column: 1 / -1;">
                            <span class="mobile-card-label">Progress</span>
                            <span class="mobile-card-value">${progressPercentage.toFixed(1)}%</span>
                            <div class="mobile-progress-bar">
                                <div class="mobile-progress-fill" style="width: ${progressPercentage}%"></div>
                            </div>
                            <small style="color: var(--medium-gray);">Status: <span class="${statusClass}">${page.status || 'Pending'}</span></small>
                        </div>
                    </div>
                </div>
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

            const chartData = [
                Math.max(pending, 0.1),
                Math.max(inProgress, 0.1), 
                Math.max(completed, 0.1)
            ];
            
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
        const summary = this.data.summary || {};
        
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

        recommendation.className = 'recommendation';
        if (insights.performance_trend === 'Behind Schedule') {
            recommendation.style.background = 'linear-gradient(135deg, #ffeaea 0%, #fff0f0 100%)';
            recommendation.style.borderLeftColor = '#e74c3c';
        } else if (insights.performance_trend === 'Slightly Behind') {
            recommendation.style.background = 'linear-gradient(135deg, #fff8e1 0%, #fffbf0 100%)';
            recommendation.style.borderLeftColor = '#f39c12';
        }

        // Enhanced insights
        const remaining = insights.remaining_questions;
        const daysLeft = summary.days_remaining || 1;
        const hoursLeft = daysLeft * 24;
        const minutesLeft = hoursLeft * 60;
        
        const questionsPerDay = (remaining / Math.max(daysLeft, 0.1)).toFixed(1);
        const questionsPerHour = (remaining / Math.max(hoursLeft, 0.1)).toFixed(1);
        const questionsPerMinute = (remaining / Math.max(minutesLeft, 1)).toFixed(2);
        
        this.updateEnhancedInsights({
            questionsPerDay,
            questionsPerHour, 
            questionsPerMinute,
            allocatedProgress: summary.allocated_progress_percentage || 0,
            totalProgress: summary.progress_percentage || 0
        });
    }

    // Admin panel functionality moved to separate admin page for better performance

    hideAdminColumns() {
        const adminColumns = document.querySelectorAll('.admin-only');
        adminColumns.forEach(col => col.style.display = 'none');
        
        // Hide milestones overview for non-admin
        const milestonesOverview = document.getElementById('milestonesOverview');
        if (milestonesOverview) {
            milestonesOverview.style.display = 'none';
        }
    }

    async addPage() {
        const pageName = document.getElementById('pageName').value;
        const pageLink = document.getElementById('pageLink').value;
        const totalQuestions = parseInt(document.getElementById('totalQuestions').value);

        if (!this.isAdminLoggedIn) {
            this.showToast('Please login as admin first', 'error');
            return;
        }

        try {
            const response = await fetch('/api/add_page', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify({
                    page_name: pageName,
                    page_link: pageLink,
                    total_questions: totalQuestions
                })
            });

            if (response.ok) {
                this.showToast('Page added successfully!', 'success');
                document.getElementById('addPageForm').reset();
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
        document.getElementById('updateCompleted').value = page.completed_questions || 0;
        document.getElementById('updateCompleted').max = page.total_questions;
        document.getElementById('updateTotal').textContent = page.total_questions;
        
        document.getElementById('updateModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('updateModal').style.display = 'none';
    }

    async updatePage() {
        const pageId = document.getElementById('updatePageId').value;
        const completed = parseInt(document.getElementById('updateCompleted').value);
        
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

        if (!this.isAdminLoggedIn) {
            this.showToast('Please login as admin first', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/page/${pageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
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
            if (row.querySelector('.text-center')) return;
            
            const pageName = row.cells[1].textContent.toLowerCase();
            const status = row.cells[7] ? row.cells[7].textContent.trim() : '';
            
            const matchesSearch = pageName.includes(searchTerm);
            const matchesStatus = !statusFilter || status === statusFilter;
            
            row.style.display = matchesSearch && matchesStatus ? '' : 'none';
        });
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.loadData();
        }, 3600000); // 1 hour = 3600000ms
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    resetCountdown() {
        this.countdownTime = 30;
    }

    updateCountdown() {
        this.countdownInterval = setInterval(() => {
            this.countdownTime--;
            
            const countdownEl = document.getElementById('refreshCountdown');
            if (countdownEl) {
                countdownEl.textContent = this.countdownTime;
            }
            
            if (this.countdownTime <= 0) {
                this.resetCountdown();
            }
        }, 1000);
    }

    showLoading() {
        const tbody = document.getElementById('pagesTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i> Loading data...
                    </div>
                </td>
            </tr>
        `;
    }

    hideLoading() {
        // Loading will be replaced by actual data in updatePagesTable
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
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

    clearSensitiveData() {
        const sensitiveFields = ['adminEmail', 'adminPassword'];
        sensitiveFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
            }
        });
        
        this.adminToken = null;
        
        if (localStorage.getItem('adminToken')) {
            localStorage.removeItem('adminToken');
        }
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    }
    
    updateEnhancedInsights(metrics) {
        let insightsContainer = document.getElementById('enhancedInsights');
        if (!insightsContainer) {
            const insightsSection = document.getElementById('insightsSection');
            if (insightsSection) {
                insightsContainer = document.createElement('div');
                insightsContainer.id = 'enhancedInsights';
                insightsContainer.className = 'insights-grid';
                insightsSection.appendChild(insightsContainer);
            } else {
                return;
            }
        }
        
        insightsContainer.innerHTML = `
            <div class="insight-card">
                <h4><i class="fas fa-clock"></i> Required Completion Rate</h4>
                <div class="insight-metric">
                    <span class="insight-label">Per Day:</span>
                    <span class="insight-value ${metrics.questionsPerDay > 50 ? 'critical' : metrics.questionsPerDay > 20 ? 'warning' : 'success'}">${metrics.questionsPerDay} questions</span>
                </div>
                <div class="insight-metric">
                    <span class="insight-label">Per Hour:</span>
                    <span class="insight-value ${metrics.questionsPerHour > 3 ? 'critical' : metrics.questionsPerHour > 1 ? 'warning' : 'success'}">${metrics.questionsPerHour} questions</span>
                </div>
                <div class="insight-metric">
                    <span class="insight-label">Per Minute:</span>
                    <span class="insight-value">${metrics.questionsPerMinute} questions</span>
                </div>
            </div>
            <div class="insight-card">
                <h4><i class="fas fa-chart-line"></i> Progress Breakdown</h4>
                <div class="insight-metric">
                    <span class="insight-label">Allocated Progress:</span>
                    <span class="insight-value success">${metrics.allocatedProgress}%</span>
                </div>
                <div class="insight-metric">
                    <span class="insight-label">Total Project Progress:</span>
                    <span class="insight-value">${metrics.totalProgress}%</span>
                </div>
                <div class="insight-metric">
                    <span class="insight-label">Efficiency Score:</span>
                    <span class="insight-value ${metrics.allocatedProgress > 80 ? 'success' : metrics.allocatedProgress > 60 ? 'warning' : 'critical'}">${metrics.allocatedProgress > 80 ? 'Excellent' : metrics.allocatedProgress > 60 ? 'Good' : 'Needs Improvement'}</span>
                </div>
            </div>
        `;
    }

    // Milestone Management Methods
    updateMilestonesDisplay() {
        const milestonesGrid = document.getElementById('milestonesGrid');
        if (!milestonesGrid) return;

        milestonesGrid.innerHTML = '';

        if (this.data.milestones.length === 0) {
            milestonesGrid.innerHTML = `
                <div class="milestone-card">
                    <div class="milestone-title">No Milestones Created</div>
                    <p>Click "Add New Milestone" to create your first milestone.</p>
                </div>
            `;
            return;
        }

        this.data.milestones.forEach((milestone, index) => {
            const isActive = index === 0; // First milestone is active
            const completedQuestions = this.calculateMilestoneProgress(milestone);
            const progressPercent = (completedQuestions / milestone.total_questions) * 100;

            const milestoneCard = document.createElement('div');
            milestoneCard.className = `milestone-card ${isActive ? 'active' : ''}`;
            milestoneCard.innerHTML = `
                <div class="milestone-header">
                    <div class="milestone-number">${milestone.milestone_number}</div>
                    <div class="milestone-amount">$${milestone.amount}</div>
                </div>
                <div class="milestone-title">${milestone.name}</div>
                <div class="milestone-details">
                    <div class="milestone-detail">
                        <span class="milestone-detail-label">Questions:</span>
                        <span class="milestone-detail-value">${milestone.total_questions}</span>
                    </div>
                    <div class="milestone-detail">
                        <span class="milestone-detail-label">Deadline:</span>
                        <span class="milestone-detail-value">${this.formatDate(milestone.deadline)}</span>
                    </div>
                    <div class="milestone-detail">
                        <span class="milestone-detail-label">Payment:</span>
                        <span class="payment-status ${milestone.payment_status.toLowerCase()}">${milestone.payment_status}</span>
                    </div>
                </div>
                <div class="milestone-progress">
                    <div class="milestone-progress-bar">
                        <div class="milestone-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="milestone-progress-text">${completedQuestions} / ${milestone.total_questions} questions (${progressPercent.toFixed(1)}%)</div>
                </div>
                ${this.isAdminLoggedIn ? `
                    <div class="milestone-actions">
                        <button class="milestone-btn primary" onclick="tracker.editMilestone('${milestone._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <div class="payment-status-selector">
                            <select onchange="tracker.updatePaymentStatus('${milestone._id}', this.value)">
                                <option value="">Change Payment Status</option>
                                <option value="Pending" ${milestone.payment_status === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Paid" ${milestone.payment_status === 'Paid' ? 'selected' : ''}>Paid</option>
                                <option value="Cancelled" ${milestone.payment_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                                <option value="Refunded" ${milestone.payment_status === 'Refunded' ? 'selected' : ''}>Refunded</option>
                            </select>
                        </div>
                    </div>
                ` : ''}
            `;
            milestonesGrid.appendChild(milestoneCard);
        });
    }

    calculateMilestoneProgress(milestone) {
        // This is a simplified calculation - in a real scenario, 
        // you'd track which questions belong to which milestone
        const totalCompleted = this.data.summary.completed_questions || 0;
        const milestoneIndex = milestone.milestone_number - 1;
        const questionsPerMilestone = milestone.total_questions;
        
        // Simulate progress based on milestone order
        if (milestoneIndex === 0) {
            return Math.min(totalCompleted, questionsPerMilestone);
        }
        
        const previousMilestonesQuestions = this.data.milestones
            .slice(0, milestoneIndex)
            .reduce((sum, m) => sum + m.total_questions, 0);
        
        return Math.max(0, Math.min(
            totalCompleted - previousMilestonesQuestions,
            questionsPerMilestone
        ));
    }

    async updatePaymentStatus(milestoneId, newStatus) {
        if (!newStatus || !this.isAdminLoggedIn) return;

        try {
            const response = await fetch(`/api/milestones/${milestoneId}/payment-status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.adminToken}`
                },
                body: JSON.stringify({ payment_status: newStatus })
            });

            if (response.ok) {
                this.showToast('Payment status updated successfully', 'success');
                await this.loadMilestones();
            } else {
                this.showToast('Failed to update payment status', 'error');
            }
        } catch (error) {
            console.error('Error updating payment status:', error);
            this.showToast('Error updating payment status', 'error');
        }
    }

    openMilestoneModal(milestoneId = null) {
        const modal = document.getElementById('milestoneModal');
        const title = document.getElementById('milestoneModalTitle');
        const form = document.getElementById('milestoneForm');
        
        if (milestoneId) {
            title.textContent = 'Edit Milestone';
            this.loadMilestoneForEdit(milestoneId);
        } else {
            title.textContent = 'Add New Milestone';
            form.reset();
            document.getElementById('milestoneId').value = '';
        }
        
        modal.style.display = 'block';
    }

    async loadMilestoneForEdit(milestoneId) {
        try {
            const response = await fetch(`/api/milestones/${milestoneId}`);
            if (response.ok) {
                const milestone = await response.json();
                
                document.getElementById('milestoneId').value = milestone._id;
                document.getElementById('milestoneName').value = milestone.name;
                document.getElementById('milestoneAmount').value = milestone.amount;
                document.getElementById('milestoneQuestions').value = milestone.total_questions;
                document.getElementById('milestonePaymentStatus').value = milestone.payment_status;
                
                // Format datetime for input
                const deadline = new Date(milestone.deadline);
                document.getElementById('milestoneDeadline').value = 
                    deadline.toISOString().slice(0, 16);
            }
        } catch (error) {
            console.error('Error loading milestone:', error);
        }
    }

    closeMilestoneModal() {
        const modal = document.getElementById('milestoneModal');
        modal.style.display = 'none';
    }

    async handleMilestoneSubmit(e) {
        e.preventDefault();
        
        if (!this.isAdminLoggedIn) {
            this.showToast('Admin access required', 'error');
            return;
        }

        const milestoneId = document.getElementById('milestoneId').value;
        
        const milestoneData = {
            name: document.getElementById('milestoneName').value,
            total_questions: parseInt(document.getElementById('milestoneQuestions').value),
            amount: parseFloat(document.getElementById('milestoneAmount').value),
            deadline: new Date(document.getElementById('milestoneDeadline').value).toISOString(),
            payment_status: document.getElementById('milestonePaymentStatus').value
        };

        try {
            const url = milestoneId ? `/api/milestones/${milestoneId}` : '/api/milestones';
            const method = milestoneId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.adminToken}`
                },
                body: JSON.stringify(milestoneData)
            });

            if (response.ok) {
                this.showToast(
                    milestoneId ? 'Milestone updated successfully' : 'Milestone created successfully',
                    'success'
                );
                this.closeMilestoneModal();
                await this.loadMilestones();
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Failed to save milestone', 'error');
            }
        } catch (error) {
            console.error('Error saving milestone:', error);
            this.showToast('Error saving milestone', 'error');
        }
    }

    editMilestone(milestoneId) {
        this.openMilestoneModal(milestoneId);
    }

    // Helper Functions
    extractPageNameFromUrl(url) {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(part => part);
            const lastPart = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
            if (lastPart) {
                return lastPart.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
        } catch (e) {
            // If URL parsing fails, try to extract from string
            const parts = url.split('/').filter(part => part);
            const lastPart = parts[parts.length - 1] || parts[parts.length - 2];
            if (lastPart) {
                return lastPart.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
        }
        return null;
    }

    truncateUrl(url) {
        if (!url) return '';
        if (url.length <= 50) return url;
        return url.substring(0, 47) + '...';
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('URL copied to clipboard!', 'success');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showToast('URL copied to clipboard!', 'success');
            } catch (e) {
                this.showToast('Failed to copy URL', 'error');
            }
            document.body.removeChild(textArea);
        }
    }

    // Pivot Table Functions
    async generatePivotTable() {
        const groupBy = document.getElementById('pivotGroupBy').value;
        const pivotData = this.createPivotData(groupBy);
        this.renderPivotTable(pivotData, groupBy);
    }

    createPivotData(groupBy) {
        const data = {};
        
        this.data.pages.forEach(page => {
            let key = '';
            switch (groupBy) {
                case 'subject':
                    key = page.subject || 'Unknown';
                    break;
                case 'year':
                    key = page.year || 'Unknown';
                    break;
                case 'status':
                    key = page.status || 'Unknown';
                    break;
                case 'subject-year':
                    key = `${page.subject || 'Unknown'} (${page.year || 'Unknown'})`;
                    break;
                default:
                    key = 'All';
            }

            if (!data[key]) {
                data[key] = {
                    count: 0,
                    totalQuestions: 0,
                    completedQuestions: 0,
                    pendingCount: 0,
                    inProgressCount: 0,
                    completedCount: 0
                };
            }

            data[key].count++;
            data[key].totalQuestions += page.total_questions || 0;
            data[key].completedQuestions += page.completed_questions || 0;
            
            switch (page.status) {
                case 'Pending':
                    data[key].pendingCount++;
                    break;
                case 'In Progress':
                    data[key].inProgressCount++;
                    break;
                case 'Completed':
                    data[key].completedCount++;
                    break;
            }
        });

        return data;
    }

    renderPivotTable(pivotData, groupBy) {
        const thead = document.getElementById('pivotTableHead');
        const tbody = document.getElementById('pivotTableBody');
        
        // Create headers
        thead.innerHTML = `
            <tr>
                <th>${groupBy.replace('-', ' + ').toUpperCase()}</th>
                <th>Pages Count</th>
                <th>Total Questions</th>
                <th>Completed Questions</th>
                <th>Progress %</th>
                <th>Status Breakdown</th>
            </tr>
        `;

        // Create rows
        const rows = Object.entries(pivotData).map(([key, data]) => {
            const progressPercent = data.totalQuestions > 0 
                ? ((data.completedQuestions / data.totalQuestions) * 100).toFixed(1)
                : '0.0';
                
            const statusBreakdown = `
                <div class="status-breakdown">
                    <span class="status-badge pending">${data.pendingCount} Pending</span>
                    <span class="status-badge in-progress">${data.inProgressCount} In Progress</span>
                    <span class="status-badge completed">${data.completedCount} Completed</span>
                </div>
            `;

            return `
                <tr>
                    <td><strong>${key}</strong></td>
                    <td>${data.count}</td>
                    <td>${data.totalQuestions}</td>
                    <td>${data.completedQuestions}</td>
                    <td>${progressPercent}%</td>
                    <td>${statusBreakdown}</td>
                </tr>
            `;
        });

        tbody.innerHTML = rows.join('');
    }

    // ==================== ADVANCED FEATURES ====================

    initDarkMode() {
        if (this.darkMode) {
            document.body.classList.add('dark-mode');
            const icon = document.querySelector('#darkModeToggle i');
            if (icon) icon.className = 'fas fa-sun';
        }
    }

    setupAdvancedFeatures() {
        // FAB Menu Toggle
        const fabMain = document.getElementById('fabMain');
        const fabMenu = document.getElementById('fabMenu');
        if (fabMain && fabMenu) {
            fabMain.addEventListener('click', () => {
                fabMain.classList.toggle('active');
                fabMenu.classList.toggle('active');
            });
        }

        // Dark Mode Toggle (from FAB menu)
        const darkModeBtn = document.getElementById('darkModeToggle');
        if (darkModeBtn) {
            darkModeBtn.addEventListener('click', () => {
                this.toggleDarkMode();
                // Close FAB menu after action
                fabMain?.classList.remove('active');
                fabMenu?.classList.remove('active');
            });
        }

        // Export Button (from FAB menu)
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.openExportModal();
                // Close FAB menu after action
                fabMain?.classList.remove('active');
                fabMenu?.classList.remove('active');
            });
        }

        // Scroll to Top
        const scrollToTopBtn = document.getElementById('scrollToTop');
        if (scrollToTopBtn) {
            scrollToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                // Close FAB menu after action
                fabMain?.classList.remove('active');
                fabMenu?.classList.remove('active');
            });
        }

        // Share Progress
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareProgress();
                // Close FAB menu after action
                fabMain?.classList.remove('active');
                fabMenu?.classList.remove('active');
            });
        }

        // Export Modal Close
        const closeExportModal = document.getElementById('closeExportModal');
        if (closeExportModal) {
            closeExportModal.addEventListener('click', () => this.closeExportModal());
        }

        // Export Options
        document.getElementById('exportCSV')?.addEventListener('click', () => this.exportToCSV());
        document.getElementById('exportExcel')?.addEventListener('click', () => this.exportToExcel());
        document.getElementById('exportPDF')?.addEventListener('click', () => this.exportToPDF());
        document.getElementById('exportJSON')?.addEventListener('click', () => this.exportToJSON());

        // Pivot Table Controls
        const generatePivotBtn = document.getElementById('generatePivot');
        if (generatePivotBtn) {
            generatePivotBtn.addEventListener('click', () => this.generatePivotTable());
        }

        const exportPivotBtn = document.getElementById('exportPivot');
        if (exportPivotBtn) {
            exportPivotBtn.addEventListener('click', () => this.exportPivotTable());
        }
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', this.darkMode);
        
        const icon = document.querySelector('#darkModeToggle i');
        if (icon) {
            icon.className = this.darkMode ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    updateLastUpdated() {
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            const now = new Date();
            const diff = Math.floor((now - this.lastUpdateTime) / 1000);
            if (diff < 60) {
                lastUpdatedEl.textContent = 'Last updated: Just now';
            } else if (diff < 3600) {
                lastUpdatedEl.textContent = `Last updated: ${Math.floor(diff / 60)}m ago`;
            } else {
                lastUpdatedEl.textContent = `Last updated: ${Math.floor(diff / 3600)}h ago`;
            }
        }
    }

    renderTimeline() {
        const container = document.getElementById('milestoneTimeline');
        if (!container || !this.data.milestones || this.data.milestones.length === 0) return;

        const timelineHTML = `
            <div class="timeline-line"></div>
            <div class="timeline-items">
                ${this.data.milestones.map((milestone, index) => {
                    const progress = milestone.progress_percentage || 0;
                    const status = progress >= 100 ? 'completed' : progress > 0 ? 'active' : 'pending';
                    const markerContent = progress >= 100 ? '<i class="fas fa-check"></i>' : (index + 1);
                    
                    return `
                        <div class="timeline-item">
                            <div class="timeline-marker ${status}">
                                ${markerContent}
                            </div>
                            <div class="timeline-content">
                                <div class="timeline-title">${milestone.title}</div>
                                <div class="timeline-date">${new Date(milestone.deadline).toLocaleDateString()}</div>
                                <div class="timeline-progress">${progress.toFixed(1)}%</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        container.innerHTML = timelineHTML;
    }

    updateQuickStats() {
        if (!this.data.pages || this.data.pages.length === 0) return;

        // Average Questions Per Page
        const totalQuestions = this.data.pages.reduce((sum, p) => sum + (p.total_questions || 0), 0);
        const avgQuestions = (totalQuestions / this.data.pages.length).toFixed(1);
        this.animateNumber('avgQuestionsPerPage', avgQuestions);

        // Most Productive Subject
        const subjectStats = {};
        this.data.pages.forEach(page => {
            const subject = page.subject || 'Unknown';
            if (!subjectStats[subject]) subjectStats[subject] = 0;
            subjectStats[subject] += page.completed_questions || 0;
        });
        const topSubject = Object.keys(subjectStats).reduce((a, b) => 
            subjectStats[a] > subjectStats[b] ? a : b, 'N/A');
        document.getElementById('topSubject').textContent = topSubject;

        // Completion Rate
        const completedPages = this.data.pages.filter(p => p.status === 'Completed').length;
        const completionRate = ((completedPages / this.data.pages.length) * 100).toFixed(1);
        document.getElementById('completionRate').textContent = `${completionRate}%`;

        // Estimated Completion
        if (this.data.progressData && this.data.progressData.days_remaining) {
            const daysRemaining = this.data.progressData.days_remaining;
            const estDate = new Date();
            estDate.setDate(estDate.getDate() + daysRemaining);
            document.getElementById('estimatedCompletion').textContent = estDate.toLocaleDateString();
        }
    }

    animateNumber(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element || typeof CountUp === 'undefined') {
            element.textContent = targetValue;
            return;
        }

        const countUp = new CountUp(elementId, targetValue, {
            duration: 2,
            decimal: '.',
            decimalPlaces: 1
        });
        if (!countUp.error) {
            countUp.start();
        } else {
            element.textContent = targetValue;
        }
    }

    renderAdvancedCharts() {
        this.renderMilestoneChart();
        this.renderSubjectChart();
        this.renderProgressLineChart();
    }

    renderMilestoneChart() {
        const ctx = document.getElementById('milestoneChart');
        if (!ctx || !this.data.milestones) return;

        if (this.charts.milestone) {
            this.charts.milestone.destroy();
        }

        this.charts.milestone = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: this.data.milestones.map(m => m.title),
                datasets: [{
                    data: this.data.milestones.map(m => m.completed_questions || 0),
                    backgroundColor: this.milestoneColors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: false
                    }
                }
            }
        });
    }

    renderSubjectChart() {
        const ctx = document.getElementById('subjectChart');
        if (!ctx || !this.data.pages) return;

        if (this.charts.subject) {
            this.charts.subject.destroy();
        }

        const subjectData = {};
        this.data.pages.forEach(page => {
            const subject = page.subject || 'Unknown';
            if (!subjectData[subject]) subjectData[subject] = 0;
            subjectData[subject] += page.total_questions || 0;
        });

        this.charts.subject = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(subjectData),
                datasets: [{
                    label: 'Questions',
                    data: Object.values(subjectData),
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderProgressLineChart() {
        const ctx = document.getElementById('progressLineChart');
        if (!ctx || !this.data.milestones) return;

        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }

        const labels = this.data.milestones.map((m, i) => `M${i + 1}`);
        const completedData = this.data.milestones.map(m => m.completed_questions || 0);
        const totalData = this.data.milestones.map(m => m.total_questions || 0);

        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Completed',
                        data: completedData,
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Total',
                        data: totalData,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    checkMilestoneCompletion() {
        if (!this.data.progressData) return;

        const overallProgress = this.data.progressData.overall_progress_percentage || 0;
        
        if (overallProgress >= 100 && typeof confetti !== 'undefined') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    // Export Functions
    openExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) modal.style.display = 'flex';
    }

    closeExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) modal.style.display = 'none';
    }

    exportToCSV() {
        const csvData = [
            ['Page Name', 'Page Link', 'Total Questions', 'Completed', 'Remaining', 'Status', 'Subject', 'Year'],
            ...this.data.pages.map(page => [
                page.page_name || '',
                page.page_link || '',
                page.total_questions || 0,
                page.completed_questions || 0,
                (page.total_questions || 0) - (page.completed_questions || 0),
                page.status || '',
                page.subject || '',
                page.year || ''
            ])
        ];

        const csv = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        this.downloadFile(csv, 'milestone-tracker-data.csv', 'text/csv');
        this.closeExportModal();
    }

    exportToExcel() {
        if (typeof XLSX === 'undefined') {
            alert('Excel export library not loaded');
            return;
        }

        const wsData = [
            ['Page Name', 'Page Link', 'Total Questions', 'Completed', 'Remaining', 'Status', 'Subject', 'Year'],
            ...this.data.pages.map(page => [
                page.page_name || '',
                page.page_link || '',
                page.total_questions || 0,
                page.completed_questions || 0,
                (page.total_questions || 0) - (page.completed_questions || 0),
                page.status || '',
                page.subject || '',
                page.year || ''
            ])
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Pages');
        XLSX.writeFile(wb, 'milestone-tracker-data.xlsx');
        this.closeExportModal();
    }

    exportToPDF() {
        if (typeof jspdf === 'undefined') {
            alert('PDF export library not loaded');
            return;
        }

        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('IITian Academy - Progress Report', 20, 20);
        
        doc.setFontSize(12);
        let y = 40;
        
        if (this.data.progressData) {
            doc.text(`Overall Progress: ${this.data.progressData.overall_progress_percentage || 0}%`, 20, y);
            y += 10;
            doc.text(`Completed: ${this.data.progressData.overall_completed || 0} / ${this.data.progressData.overall_total || 0}`, 20, y);
            y += 10;
            doc.text(`Total Pages: ${this.data.pages.length}`, 20, y);
            y += 20;
        }

        doc.text('Pages:', 20, y);
        y += 10;

        this.data.pages.slice(0, 30).forEach((page, index) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            doc.setFontSize(10);
            doc.text(`${index + 1}. ${page.page_name || 'Untitled'} - ${page.completed_questions || 0}/${page.total_questions || 0}`, 20, y);
            y += 7;
        });

        doc.save('milestone-tracker-report.pdf');
        this.closeExportModal();
    }

    exportToJSON() {
        const data = JSON.stringify(this.data, null, 2);
        this.downloadFile(data, 'milestone-tracker-data.json', 'application/json');
        this.closeExportModal();
    }

    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    shareProgress() {
        if (!this.data.progressData) return;

        const progress = this.data.progressData;
        const completionRate = Math.round(progress.overall_progress_percentage || 0);
        const currentMilestone = this.data.milestones?.find(m => m.completed_questions < m.total_questions);
        const milestoneName = currentMilestone ? currentMilestone.milestone_name : 'Final Milestone';

        const shareText = `📊 IITian Academy Progress Report
━━━━━━━━━━━━━━━━━━━━━━━━
📈 Overall Progress: ${completionRate}%
✅ Completed: ${progress.overall_completed || 0}/${progress.overall_total || 0} questions
📚 Total Pages: ${this.data.pages.length}
🎯 Current Milestone: ${milestoneName}
━━━━━━━━━━━━━━━━━━━━━━━━

Keep pushing forward! 🚀`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareText).then(() => {
                this.showToast('Progress summary copied to clipboard!', 'success');
            }).catch(err => {
                this.showToast('Failed to copy to clipboard', 'error');
            });
        } else {
            // Fallback: create textarea and copy
            const textarea = document.createElement('textarea');
            textarea.value = shareText;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                this.showToast('Progress summary copied to clipboard!', 'success');
            } catch (err) {
                this.showToast('Failed to copy to clipboard', 'error');
            }
            document.body.removeChild(textarea);
        }
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 30px;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            font-size: 14px;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    generatePivotTable() {
        const groupBy = document.getElementById('pivotGroupBy')?.value || 'year';
        const pivotTableBody = document.getElementById('pivotTableBody');
        
        if (!pivotTableBody || !this.data.pages) return;

        // Group data by selected dimension
        const groups = {};
        this.data.pages.forEach(page => {
            let key;
            switch (groupBy) {
                case 'year':
                    key = page.year || 'Unknown Year';
                    break;
                case 'subject':
                    key = page.subject || 'Unknown Subject';
                    break;
                case 'milestone':
                    key = page.milestone_name || 'No Milestone';
                    break;
                case 'status':
                    key = page.status || 'Unknown Status';
                    break;
                default:
                    key = 'Unknown';
            }

            if (!groups[key]) {
                groups[key] = {
                    totalPages: 0,
                    totalQuestions: 0,
                    completed: 0,
                    remaining: 0,
                    statusBreakdown: {},
                    subjectBreakdown: {},
                    yearBreakdown: {}
                };
            }

            groups[key].totalPages++;
            groups[key].totalQuestions += page.total_questions || 0;
            groups[key].completed += page.completed_questions || 0;
            groups[key].remaining += (page.total_questions || 0) - (page.completed_questions || 0);
            
            // Track status breakdown
            const status = page.status || 'Unknown';
            groups[key].statusBreakdown[status] = (groups[key].statusBreakdown[status] || 0) + 1;
            
            // Track subject breakdown
            const subject = page.subject || 'Unknown';
            groups[key].subjectBreakdown[subject] = (groups[key].subjectBreakdown[subject] || 0) + 1;
            
            // Track year breakdown
            const year = page.year || 'Unknown';
            groups[key].yearBreakdown[year] = (groups[key].yearBreakdown[year] || 0) + 1;
        });

        // Custom sorting based on group type
        const sortedGroups = Object.entries(groups).sort((a, b) => {
            if (groupBy === 'year') {
                // Sort years numerically
                const yearA = parseInt(a[0]) || 9999;
                const yearB = parseInt(b[0]) || 9999;
                return yearA - yearB;
            } else if (groupBy === 'status') {
                // Custom status order
                const statusOrder = { 'Not Started': 1, 'In Progress': 2, 'Completed': 3, 'Unknown Status': 4 };
                return (statusOrder[a[0]] || 5) - (statusOrder[b[0]] || 5);
            } else {
                // Alphabetical for subject/milestone
                return a[0].localeCompare(b[0]);
            }
        });

        // Generate table rows with enhanced styling
        const rows = sortedGroups.map(([category, data]) => {
            const progress = data.totalQuestions > 0 
                ? Math.round((data.completed / data.totalQuestions) * 100) 
                : 0;
            
            // Color code progress
            let progressColor = '#e74c3c'; // red
            if (progress >= 75) progressColor = '#27ae60'; // green
            else if (progress >= 50) progressColor = '#f39c12'; // orange
            else if (progress >= 25) progressColor = '#3498db'; // blue
            
            // Format status breakdown with icons
            const statusText = Object.entries(data.statusBreakdown)
                .sort((a, b) => b[1] - a[1]) // Sort by count
                .map(([status, count]) => {
                    const icon = status === 'Completed' ? '✅' : 
                                status === 'In Progress' ? '🔄' : 
                                status === 'Not Started' ? '⏸️' : '❓';
                    return `${icon} ${status}: ${count}`;
                })
                .join('<br>');

            return `
                <tr class="pivot-row" data-progress="${progress}">
                    <td class="pivot-category"><strong>${category}</strong></td>
                    <td class="text-center">${data.totalPages}</td>
                    <td class="text-center"><strong>${data.totalQuestions}</strong></td>
                    <td class="text-center" style="color: #27ae60;">${data.completed}</td>
                    <td class="text-center" style="color: #e74c3c;">${data.remaining}</td>
                    <td>
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width: ${progress}%; background: ${progressColor};">
                                <span class="progress-label">${progress}%</span>
                            </div>
                        </div>
                    </td>
                    <td class="status-breakdown" style="font-size: 0.85em; line-height: 1.6;">${statusText}</td>
                </tr>
            `;
        }).join('');

        // Calculate totals
        const totals = sortedGroups.reduce((acc, [_, group]) => ({
            totalPages: acc.totalPages + group.totalPages,
            totalQuestions: acc.totalQuestions + group.totalQuestions,
            completed: acc.completed + group.completed,
            remaining: acc.remaining + group.remaining
        }), { totalPages: 0, totalQuestions: 0, completed: 0, remaining: 0 });

        const totalProgress = totals.totalQuestions > 0 
            ? Math.round((totals.completed / totals.totalQuestions) * 100) 
            : 0;

        // Totals row with enhanced styling
        const totalsRow = `
            <tr class="pivot-totals-row">
                <td><strong>📊 TOTAL</strong></td>
                <td class="text-center"><strong>${totals.totalPages}</strong></td>
                <td class="text-center"><strong>${totals.totalQuestions}</strong></td>
                <td class="text-center" style="color: #27ae60;"><strong>${totals.completed}</strong></td>
                <td class="text-center" style="color: #e74c3c;"><strong>${totals.remaining}</strong></td>
                <td>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${totalProgress}%; background: linear-gradient(135deg, #667eea, #764ba2);">
                            <span class="progress-label"><strong>${totalProgress}%</strong></span>
                        </div>
                    </div>
                </td>
                <td class="text-center">-</td>
            </tr>
        `;

        // Summary statistics row
        const avgProgress = sortedGroups.length > 0 
            ? Math.round(sortedGroups.reduce((sum, [_, g]) => {
                const p = g.totalQuestions > 0 ? (g.completed / g.totalQuestions) * 100 : 0;
                return sum + p;
              }, 0) / sortedGroups.length)
            : 0;

        const summaryRow = `
            <tr class="pivot-summary-row">
                <td colspan="7" style="background: #f8f9fa; padding: 12px; font-size: 0.9em;">
                    <strong>📈 Summary:</strong> 
                    ${sortedGroups.length} ${groupBy}(s) • 
                    Average Progress: ${avgProgress}% • 
                    Completion Rate: ${totalProgress}% • 
                    ${totals.completed} of ${totals.totalQuestions} questions completed
                </td>
            </tr>
        `;

        pivotTableBody.innerHTML = rows + totalsRow + summaryRow;
        
        // Show success message with details
        this.showToast(`✅ Pivot table generated: ${sortedGroups.length} ${groupBy}(s) analyzed`, 'success');
    }

    exportPivotTable() {
        const groupBy = document.getElementById('pivotGroupBy')?.value || 'year';
        const pivotTableBody = document.getElementById('pivotTableBody');
        
        if (!pivotTableBody || !pivotTableBody.children.length) {
            this.showToast('Please generate pivot table first', 'error');
            return;
        }

        // Extract data from table
        let csvContent = `Category,Total Pages,Total Questions,Completed,Remaining,Progress %,Status Breakdown\n`;
        
        Array.from(pivotTableBody.children).forEach(row => {
            const cells = Array.from(row.children);
            const rowData = cells.map(cell => {
                let text = cell.textContent.trim();
                // Remove progress bar text
                if (cell.querySelector('.progress-text')) {
                    text = cell.querySelector('.progress-text').textContent.trim();
                }
                return `"${text}"`;
            }).join(',');
            csvContent += rowData + '\n';
        });

        this.downloadFile(csvContent, `pivot-table-${groupBy}.csv`, 'text/csv');
        this.showToast('Pivot table exported to CSV', 'success');
    }

    updateEnhancedInsights() {
        if (!this.data.pages || !this.data.progressData) return;

        const progress = this.data.progressData;
        
        // 1. Daily Average
        const totalCompleted = progress.overall_completed || 0;
        const totalPages = this.data.pages.length;
        const projectDuration = 90; // Assume 90 days project duration
        const dailyAverage = projectDuration > 0 ? Math.round(totalCompleted / projectDuration * 10) / 10 : 0;
        
        const remainingQuestions = progress.overall_total - totalCompleted;
        const daysRemaining = progress.days_remaining || 30;
        const requiredDaily = daysRemaining > 0 ? Math.round(remainingQuestions / daysRemaining * 10) / 10 : 0;
        
        const dailyTrend = dailyAverage >= requiredDaily ? '📈 On pace' : '⚠️ Need to increase';
        
        document.getElementById('dailyAverage').textContent = dailyAverage;
        document.getElementById('dailyTrend').textContent = dailyTrend;

        // 2. Estimated Completion
        const completionDate = progress.estimated_completion_date || 'Not set';
        const daysRemainingText = `${daysRemaining} days remaining`;
        
        document.getElementById('estimatedCompletionDate').textContent = completionDate;
        document.getElementById('daysRemaining').textContent = daysRemainingText;

        // 3. Performance Trend
        const completionRate = progress.overall_progress_percentage || 0;
        const expectedRate = 50; // Expected 50% by midpoint
        
        let trendStatus, trendDetails;
        if (completionRate >= expectedRate * 1.1) {
            trendStatus = '🎯 Ahead of Schedule';
            trendDetails = `${Math.round(completionRate - expectedRate)}% ahead`;
        } else if (completionRate >= expectedRate * 0.9) {
            trendStatus = '✅ On Track';
            trendDetails = 'Meeting expectations';
        } else {
            trendStatus = '⚠️ Behind Schedule';
            trendDetails = `${Math.round(expectedRate - completionRate)}% behind`;
        }
        
        document.getElementById('performanceTrend').textContent = trendStatus;
        document.getElementById('trendDetails').textContent = trendDetails;

        // 4. Productivity Score
        const timeEfficiency = Math.min(completionRate / (100 - (daysRemaining / 90 * 100)), 1);
        const completionFactor = completionRate / 100;
        const consistencyFactor = 0.8; // Placeholder - would need completion history
        
        const productivityScore = Math.round(
            (completionFactor * 50) + 
            (timeEfficiency * 30) + 
            (consistencyFactor * 20)
        );
        
        const scoreBreakdown = `Progress: ${Math.round(completionFactor * 50)} | Efficiency: ${Math.round(timeEfficiency * 30)} | Consistency: ${Math.round(consistencyFactor * 20)}`;
        
        document.getElementById('productivityScore').textContent = productivityScore;
        document.getElementById('scoreBreakdown').textContent = scoreBreakdown;

        // 5. Current Streak (placeholder - would need completion history)
        const currentStreak = 7; // Placeholder
        const streakMessage = currentStreak >= 7 ? '🔥 Great momentum!' : '💪 Keep building';
        
        document.getElementById('currentStreak').textContent = `${currentStreak} days`;
        document.getElementById('streakMessage').textContent = streakMessage;

        // 6. Best Day (calculate from pages)
        const subjectStats = {};
        this.data.pages.forEach(page => {
            const subject = page.subject || 'Unknown';
            if (!subjectStats[subject]) {
                subjectStats[subject] = 0;
            }
            subjectStats[subject] += page.completed_questions || 0;
        });
        
        const bestSubject = Object.entries(subjectStats)
            .sort((a, b) => b[1] - a[1])[0];
        
        const bestDay = bestSubject ? bestSubject[0] : 'N/A';
        const bestDayQuestions = bestSubject ? `${bestSubject[1]} questions` : '0 questions';
        
        document.getElementById('bestDay').textContent = bestDay;
        document.getElementById('bestDayQuestions').textContent = bestDayQuestions;
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
