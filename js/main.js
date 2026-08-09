import { fetchCollection, fetchDocument } from './firebase-service.js';

document.addEventListener('DOMContentLoaded', () => {
  // --- 1. Loader Logic ---
  const loader = document.getElementById('loader');
  const hideLoader = () => {
    if (loader) {
      loader.classList.add('hide');
    }
  };

  // Safe timeout to hide loader if Firebase takes too long
  const loaderTimeout = setTimeout(hideLoader, 4000);

  // --- 2. Theme Logic (Dark / Light) ---
  const themeToggleBtn = document.getElementById('themeToggle');
  const htmlElement = document.documentElement;

  // Initialize theme from localStorage or system preference
  const savedTheme = localStorage.getItem('portfolio-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    htmlElement.setAttribute('data-theme', savedTheme);
  } else if (prefersDark) {
    htmlElement.setAttribute('data-theme', 'dark');
  } else {
    htmlElement.setAttribute('data-theme', 'light');
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = htmlElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      htmlElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('portfolio-theme', newTheme);
    });
  }

  // --- 3. Navigation Scrolling & Mobile Hamburger ---
  const header = document.getElementById('header');
  const hamburgerMenu = document.getElementById('hamburgerMenu');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');

  // Sticky Header on Scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Toggle Hamburger Menu
  if (hamburgerMenu && navMenu) {
    hamburgerMenu.addEventListener('click', () => {
      const isOpen = hamburgerMenu.classList.toggle('open');
      navMenu.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  // Close Menu on Nav Link Click
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (hamburgerMenu && hamburgerMenu.classList.contains('open')) {
        hamburgerMenu.classList.remove('open');
        navMenu.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });

  // --- 4. Scrollspy Active State ---
  const sections = document.querySelectorAll('section[id]');
  const scrollspyOptions = {
    root: null,
    rootMargin: '-50% 0px -50% 0px', // Trigger when section occupies the middle of the viewport
    threshold: 0
  };

  const scrollspyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, scrollspyOptions);

  sections.forEach(section => scrollspyObserver.observe(section));

  // --- 5. Firebase Dynamic Content Hydration ---
  async function hydratePortfolio() {
    try {
      // Fetch data in parallel
      const [
        profileData,
        siteSettings,
        skillsData,
        experienceData,
        publishedAppsData,
        packagesData,
        projectsData
      ] = await Promise.allSettled([
        fetchDocument('profile'),
        fetchDocument('site_settings'),
        fetchCollection('skills', 'order', 'asc'),
        fetchCollection('experience', 'order', 'asc'),
        fetchCollection('published_apps', 'order', 'asc'),
        fetchCollection('packages', 'order', 'asc'),
        fetchCollection('projects', 'order', 'asc')
      ]);

      // Helper to check if a promise call succeeded and has data
      const isSuccess = (result) => result.status === 'fulfilled' && result.value;

      // A. Profile Hydration
      if (isSuccess(profileData)) {
        const profile = profileData.value;
        if (profile.name) document.querySelectorAll('.hero-title').forEach(el => el.textContent = profile.name);
        if (profile.title) document.querySelectorAll('.hero-subtitle').forEach(el => el.textContent = profile.title);
        if (profile.shortBio) {
          const heroSub = document.getElementById('heroSubtitle');
          if (heroSub) heroSub.textContent = profile.shortBio;
        }
        if (profile.longBio) {
          const longBioEl = document.getElementById('longBio');
          if (longBioEl) longBioEl.textContent = profile.longBio;
        }
        if (profile.profileImage && typeof profile.profileImage === 'string' && profile.profileImage.trim() !== '' && profile.profileImage !== 'null' && profile.profileImage !== 'undefined') {
          const profileImg = document.getElementById('profileImage');
          if (profileImg) profileImg.src = profile.profileImage;
        }
        if (profile.resumeUrl) {
          const resumeBtn = document.getElementById('resumeBtn');
          if (resumeBtn) resumeBtn.href = profile.resumeUrl;
        }
        if (profile.availability) {
          const availBadge = document.getElementById('availabilityText');
          if (availBadge) {
            availBadge.textContent = profile.availability;
            availBadge.style.display = 'inline-flex';
          }
        }
        
        // Dynamic Social Links hydration
        if (profile.githubUrl) {
          document.querySelectorAll('a[href*="github.com/rahimuj570"]').forEach(el => {
            el.href = profile.githubUrl;
            el.style.display = '';
          });
        }
        if (profile.linkedinUrl) {
          const linkedin = document.getElementById('linkedinLink');
          if (linkedin) {
            linkedin.href = profile.linkedinUrl;
            linkedin.textContent = profile.linkedinUrl.replace('https://', '').replace('www.', '');
          }
        }
        if (profile.email) {
          const emailText = document.getElementById('emailText');
          if (emailText) {
            emailText.href = `mailto:${profile.email}`;
            emailText.textContent = profile.email;
          }
          const emailBtn = document.getElementById('emailBtn');
          if (emailBtn) emailBtn.href = `mailto:${profile.email}`;
        }
      }

      // B. Site Settings Hydration
      if (isSuccess(siteSettings)) {
        const settings = siteSettings.value;
        if (settings.siteTitle) document.title = settings.siteTitle;
        if (settings.copyrightYear) {
          const copyrightEl = document.getElementById('footerCopyright');
          if (copyrightEl) {
            copyrightEl.innerHTML = `Copyright &copy; ${settings.copyrightYear} Md. Rahimujjaman Rahim. All rights reserved.`;
          }
        }
      }

      // C. Skills Hydration
      if (isSuccess(skillsData) && skillsData.value.length > 0) {
        const skills = skillsData.value;
        const container = document.getElementById('skillsContainer');
        if (container) {
          container.innerHTML = ''; // Clear fallback grid
          
          // Group skills by category
          const categories = {};
          skills.forEach(skill => {
            const cat = skill.category || 'Other';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(skill);
          });

          // Render categories
          Object.keys(categories).forEach(cat => {
            const card = document.createElement('div');
            card.className = 'skills-category-card';
            card.innerHTML = `<h3 class="category-title">${cat}</h3>`;
            
            const tagsBox = document.createElement('div');
            tagsBox.className = 'tags-container';
            
            categories[cat].forEach(skill => {
              const tag = document.createElement('span');
              tag.className = 'tech-tag';
              tag.textContent = skill.name;
              tag.setAttribute('data-skill', skill.name.toLowerCase().replace(/\s+/g, '-'));
              tagsBox.appendChild(tag);
            });
            
            card.appendChild(tagsBox);
            container.appendChild(card);
          });
        }
      }

      // D. Experience & Education Hydration
      if (isSuccess(experienceData) && experienceData.value.length > 0) {
        const experience = experienceData.value;
        const container = document.getElementById('experienceContainer');
        if (container) {
          container.innerHTML = ''; // Clear fallback timeline
          
          experience.forEach(exp => {
            const item = document.createElement('div');
            item.className = `timeline-item ${exp.isCurrent ? 'current' : ''}`;
            
            item.innerHTML = `
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <span class="timeline-date">${exp.startDate || ''} ${exp.endDate ? '- ' + exp.endDate : (exp.isCurrent ? 'Current' : '')}</span>
                <h3 class="timeline-role">${exp.position || ''}</h3>
                <h4 class="timeline-company">${exp.company || ''}</h4>
                <p class="timeline-text">${exp.description || ''}</p>
              </div>
            `;
            container.appendChild(item);
          });
        }
      }

      // E. Published Applications Hydration
      if (isSuccess(publishedAppsData) && publishedAppsData.value.length > 0) {
        const apps = publishedAppsData.value;
        const container = document.getElementById('publishedAppsContainer');
        if (container) {
          container.innerHTML = ''; // Clear fallback card
          
          apps.forEach(app => {
            const appCard = document.createElement('div');
            appCard.className = 'app-showcase-card';
            
            // Build features list
            const features = app.features || [];
            const featuresHTML = features.length > 0
              ? `<h4 class="capabilities-title">Key Core Capabilities:</h4>
                 <ul class="app-features-list">
                   ${features.map(feat => `<li>${feat}</li>`).join('')}
                 </ul>`
              : '';

            // Build tech tags
            const techs = app.technologies || [];
            const techsHTML = techs.length > 0
              ? `<div class="app-tech-tags">
                   ${techs.map(tech => `<span class="tech-tag" data-skill="${tech.toLowerCase().replace(/\s+/g, '-')}">${tech}</span>`).join('')}
                 </div>`
              : '';

            // Build store buttons
            let playStoreHTML = '';
            if (app.playStoreUrl) {
              playStoreHTML = `
                <a href="${app.playStoreUrl}" target="_blank" rel="noopener" class="store-btn play-store">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.29V3.71c0-.49.27-.92.71-1.12L13.56 12 3.71 21.41c-.44-.2-.71-.63-.71-1.12zm11.72-8.29 4.34 2.5-12.7 7.37L14.72 12zm.84-.49 4.34-2.51c.44-.25.72-.73.72-1.28s-.28-1.03-.72-1.28l-4.34-2.51L12.72 11l2.84.51zM4.77 2.12l12.7 7.37L13.56 12 4.77 2.12z"/></svg>
                  Google Play
                </a>`;
            }

            let appStoreHTML = '';
            if (app.appStoreUrl) {
              appStoreHTML = `
                <a href="${app.appStoreUrl}" target="_blank" rel="noopener" class="store-btn app-store">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.51-.64.73-1.2 1.88-1.05 2.99 1.12.09 2.26-.57 3-.14z"/></svg>
                  App Store
                </a>`;
            }

            const badgeHTML = app.featured
              ? `<div class="app-badge-featured">Featured Production Application</div>`
              : '';

            appCard.innerHTML = `
              ${badgeHTML}
              <div class="app-grid">
                <div class="app-info">
                  <h3 class="app-name">${app.name || ''}</h3>
                  <p class="app-role-tag">Role: ${app.role || 'Flutter Developer'}</p>
                  <p class="app-desc">${app.description || ''}</p>
                  
                  ${featuresHTML}
                  ${techsHTML}
                  
                  <div class="app-links">
                    ${playStoreHTML}
                    ${appStoreHTML}
                  </div>
                </div>
              </div>
            `;
            container.appendChild(appCard);
          });
        }
      }

      // F. Packages Hydration
      if (isSuccess(packagesData) && packagesData.value.length > 0) {
        const packages = packagesData.value;
        const container = document.getElementById('packagesContainer');
        if (container) {
          container.innerHTML = ''; // Clear fallback placeholder
          
          packages.forEach(pkg => {
            const card = document.createElement('div');
            card.className = 'package-card';
            
            // Build technologies list
            const techs = pkg.technologies || ['Dart', 'Flutter'];
            const techsHTML = `<div class="package-tech-tags">
              ${techs.map(t => `<span class="tech-tag" data-skill="${t.toLowerCase().replace(/\s+/g, '-')}">${t}</span>`).join('')}
            </div>`;

            // Build links
            let linksHTML = '';
            if (pkg.pubDevUrl) {
              linksHTML += `
                <a href="${pkg.pubDevUrl}" target="_blank" rel="noopener" class="package-link">
                  pub.dev
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>`;
            }
            if (pkg.githubUrl) {
              linksHTML += `
                <a href="${pkg.githubUrl}" target="_blank" rel="noopener" class="package-link">
                  GitHub
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>`;
            }

            card.innerHTML = `
              <h3 class="package-title">${pkg.name || ''}</h3>
              <span class="package-version-tag">Version: ${pkg.version || 'unknown'}</span>
              <p class="package-desc">${pkg.description || ''}</p>
              ${techsHTML}
              <div style="display:flex; gap: 15px;">
                ${linksHTML}
              </div>
            `;
            container.appendChild(card);
          });
        }
      } else {
        // If no packages exist in Firestore, hide the section entirely
        const section = document.getElementById('packages');
        if (section) {
          section.style.display = 'none';
        }
      }

      // G. Projects Hydration
      if (isSuccess(projectsData) && projectsData.value.length > 0) {
        const projects = projectsData.value;
        const container = document.getElementById('projectsContainer');
        if (container) {
          container.innerHTML = ''; // Clear static fallbacks
          
          projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';
            
            const techs = project.technologies || [];
            const techsHTML = techs.length > 0
              ? `<div class="project-tech-tags">
                   ${techs.map(t => `<span class="tech-tag" data-skill="${t.toLowerCase().replace(/\s+/g, '-')}">${t}</span>`).join('')}
                 </div>`
              : '';

            let linkHTML = '';
            if (project.githubUrl) {
              linkHTML = `
                <a href="${project.githubUrl}" target="_blank" rel="noopener" class="project-link">
                  View Source
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>`;
            } else if (project.liveUrl) {
              linkHTML = `
                <a href="${project.liveUrl}" target="_blank" rel="noopener" class="project-link">
                  View Live
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>`;
            }

            card.innerHTML = `
              <h3 class="project-title">${project.name || ''}</h3>
              <p class="project-role-tag">Role: ${project.role || 'Flutter Developer'}</p>
              <p class="project-desc">${project.description || ''}</p>
              ${techsHTML}
              ${linkHTML}
            `;
            container.appendChild(card);
          });
        }
      }
    } catch (e) {
      console.error("Critical error in portfolio hydration:", e);
    } finally {
      clearTimeout(loaderTimeout);
      hideLoader();
    }
  }

  // Execute hydration
  hydratePortfolio();
});