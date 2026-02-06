// Dark Mode Toggle Functionality

(function() {
  'use strict';

  // Check for saved theme preference or default to system preference
  function getPreferredTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  // Apply the theme to the document
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateToggleButton(theme);
    updateUtterancesTheme(theme);
  }

  // Update the toggle button text/icon
  function updateToggleButton(theme) {
    const toggleBtn = document.getElementById('dark-mode-toggle-btn');
    if (toggleBtn) {
      const moonIcon = toggleBtn.querySelector('.fa-moon');
      const sunIcon = toggleBtn.querySelector('.fa-sun');
      const textSpan = toggleBtn.querySelector('.toggle-text');
      
      if (theme === 'dark') {
        if (moonIcon) moonIcon.style.display = 'none';
        if (sunIcon) sunIcon.style.display = 'inline-block';
        if (textSpan) textSpan.textContent = 'Light Mode';
      } else {
        if (moonIcon) moonIcon.style.display = 'inline-block';
        if (sunIcon) sunIcon.style.display = 'none';
        if (textSpan) textSpan.textContent = 'Dark Mode';
      }
    }
  }

  // Update Utterances theme if present
  function updateUtterancesTheme(theme) {
    const utterancesFrame = document.querySelector('.utterances-frame');
    if (utterancesFrame) {
      const utterancesTheme = theme === 'dark' ? 'github-dark' : 'github-light';
      const message = {
        type: 'set-theme',
        theme: utterancesTheme
      };
      utterancesFrame.contentWindow.postMessage(message, 'https://utteranc.es');
    }
  }

  // Toggle between light and dark themes
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  }

  // Initialize theme on page load
  function initTheme() {
    const theme = getPreferredTheme();
    applyTheme(theme);
  }

  // Listen for system theme changes
  function listenForSystemThemeChanges() {
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
        // Only auto-switch if user hasn't manually set a preference
        if (!localStorage.getItem('theme')) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  // Set up the toggle button event listener
  function setupToggleButton() {
    const toggleBtn = document.getElementById('dark-mode-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        toggleTheme();
      });
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initTheme();
      setupToggleButton();
      listenForSystemThemeChanges();
    });
  } else {
    initTheme();
    setupToggleButton();
    listenForSystemThemeChanges();
  }

  // Also apply theme immediately to prevent flash
  initTheme();

  // Expose toggle function globally if needed
  window.toggleDarkMode = toggleTheme;
})();

// Reading Progress Indicator
(function() {
  'use strict';

  function createReadingProgress() {
    // Only create on post pages
    const postContent = document.querySelector('.post-content, .post, article');
    if (!postContent) return;

    // Create the progress container
    const container = document.createElement('div');
    container.className = 'reading-progress-container';
    container.innerHTML = `
      <div class="reading-progress-bar"></div>
    `;
    document.body.appendChild(container);

    const progressBar = container.querySelector('.reading-progress-bar');

    function updateProgress() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      if (docHeight <= 0) {
        container.style.display = 'none';
        return;
      }

      container.style.display = 'block';
      
      const scrollPercent = Math.min(Math.max((scrollTop / docHeight) * 100, 0), 100);

      progressBar.style.width = scrollPercent + '%';

      // Check if bottom bar is visible and adjust position
      const bottomBar = document.getElementById('bottom-bar');
      if (bottomBar) {
        const bottomBarStyle = window.getComputedStyle(bottomBar);
        const bottomBarVisible = bottomBarStyle.display !== 'none' && 
                                  bottomBarStyle.visibility !== 'hidden' &&
                                  bottomBarStyle.opacity !== '0';
        
        // Check if bottom bar is transformed off screen
        const transform = bottomBarStyle.transform;
        const isTransformedAway = transform && transform.includes('matrix') && 
                                   transform.includes('60'); // translateY(60px) hides it
        
        if (bottomBarVisible && !isTransformedAway) {
          container.style.bottom = '60px';
        } else {
          container.style.bottom = '0';
        }
      }
    }

    // Throttle scroll event for performance
    let ticking = false;
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          updateProgress();
          ticking = false;
        });
        ticking = true;
      }
    });

    // Initial update
    updateProgress();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createReadingProgress);
  } else {
    createReadingProgress();
  }
})();

// Table of Contents Generator
(function() {
  'use strict';

  function createTableOfContents() {
    // Only create on post pages
    const postContent = document.querySelector('.post-content');
    if (!postContent) return;

    // Find all headings in post content
    const headings = postContent.querySelectorAll('h2, h3, h4, h5, h6');
    if (headings.length < 2) return; // Don't show ToC for very short posts

    // Create ToC container
    const tocContainer = document.createElement('div');
    tocContainer.className = 'toc-container';
    
    const tocTitle = document.createElement('div');
    tocTitle.className = 'toc-title';
    tocTitle.textContent = 'Table of Contents';
    tocContainer.appendChild(tocTitle);

    const tocList = document.createElement('ul');
    tocList.className = 'toc-list';

    // Process each heading
    headings.forEach(function(heading, index) {
      // Ensure heading has an ID for linking
      if (!heading.id) {
        heading.id = 'heading-' + index;
      }

      const listItem = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#' + heading.id;
      link.textContent = heading.textContent;
      link.className = 'toc-' + heading.tagName.toLowerCase();
      link.setAttribute('data-target', heading.id);

      // Smooth scroll on click
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.getElementById(heading.id);
        if (target) {
          const headerOffset = 80;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      });

      listItem.appendChild(link);
      tocList.appendChild(listItem);
    });

    tocContainer.appendChild(tocList);
    document.body.appendChild(tocContainer);

    // Scroll spy - highlight current section
    function updateActiveLink() {
      const scrollPos = window.pageYOffset || document.documentElement.scrollTop;
      const headerOffset = 100;

      let currentActive = null;

      headings.forEach(function(heading) {
        const sectionTop = heading.offsetTop - headerOffset;
        if (scrollPos >= sectionTop) {
          currentActive = heading.id;
        }
      });

      // Update active class
      const tocLinks = tocList.querySelectorAll('a');
      tocLinks.forEach(function(link) {
        if (link.getAttribute('data-target') === currentActive) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }

    // Check if sidebar is open and toggle ToC visibility
    function checkSidebarState() {
      const body = document.body;
      const isPushed = body.classList.contains('pushed');
      
      if (isPushed) {
        // Remove ToC from DOM when sidebar opens
        if (tocContainer.parentNode) {
          tocContainer.remove();
        }
      } else {
        // Add ToC back when sidebar closes
        if (!tocContainer.parentNode) {
          document.body.appendChild(tocContainer);
          setInitialTocPosition();
          updateTocPosition();
        }
      }
    }

    // Update ToC position based on scroll
    function updateTocPosition() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const postHeader = document.querySelector('.post-header');
      
      if (postHeader) {
        const headerRect = postHeader.getBoundingClientRect();
        const absoluteHeaderTop = headerRect.top + scrollTop;
        const viewportOffset = 20; // Distance from top of viewport when sticky
        
        // If scrolled past the header, stick to top of viewport
        if (scrollTop > (absoluteHeaderTop - viewportOffset)) {
          tocContainer.classList.add('toc-sticky');
          tocContainer.style.top = viewportOffset + 'px';
        } else {
          // Otherwise, keep it at title level
          tocContainer.classList.remove('toc-sticky');
          tocContainer.style.top = 'var(--initial-top)';
        }
      }
    }

    // Also listen for sidebar button clicks
    const sidebarButton = document.querySelector('.sidebar-button');
    if (sidebarButton) {
      sidebarButton.addEventListener('click', function() {
        // Use setTimeout to check after the body class changes
        setTimeout(checkSidebarState, 50);
      });
    }

    // Observe body class changes for sidebar toggle
    const bodyObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.attributeName === 'class') {
          checkSidebarState();
        }
      });
    });

    bodyObserver.observe(document.body, { attributes: true });

    // Throttle scroll event
    let tocTicking = false;
    window.addEventListener('scroll', function() {
      if (!tocTicking) {
        window.requestAnimationFrame(function() {
          updateActiveLink();
          updateTocPosition();
          tocTicking = false;
        });
        tocTicking = true;
      }
    });

    // Set initial ToC position based on post header
    function setInitialTocPosition() {
      const postHeader = document.querySelector('.post-header');
      if (postHeader) {
        const headerRect = postHeader.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const headerTop = headerRect.top + scrollTop;
        // Position ToC at the same level as the title
        tocContainer.style.setProperty('--initial-top', headerTop + 'px');
      }
    }

    // Initial updates
    setInitialTocPosition();
    updateActiveLink();
    checkSidebarState();
    updateTocPosition();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createTableOfContents);
  } else {
    createTableOfContents();
  }
})();
