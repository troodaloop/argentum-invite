/**
 * Argentum — Invite Your Lawmaker
 * Client-side JavaScript
 */
(function () {
  'use strict';

  // --- Address Form: loading state on submit ---
  const addressForm = document.getElementById('address-form');
  if (addressForm) {
    addressForm.addEventListener('submit', function (e) {
      const btn = document.getElementById('submit-btn');
      if (!addressForm.checkValidity()) return;
      btn.querySelector('.btn-text').style.display = 'none';
      btn.querySelector('.btn-loading').style.display = 'inline';
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
    });
  }

  // --- Letter: reset to default ---
  const resetBtn = document.getElementById('reset-letter');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      const body = document.getElementById('letter-body');
      const subject = document.getElementById('subject-line');
      if (body && window.__defaultLetter) body.value = window.__defaultLetter;
      if (subject && window.__defaultSubject) subject.value = window.__defaultSubject;
    });
  }

  // --- Copy Letter to Clipboard ---
  document.querySelectorAll('.copy-letter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var letter = btn.getAttribute('data-letter');
      copyToClipboard(letter, 'Letter copied to clipboard!');
    });
  });

  // --- Copy Follow-Up Letter ---
  var copyFollowup = document.getElementById('copy-followup');
  if (copyFollowup) {
    copyFollowup.addEventListener('click', function () {
      var textarea = document.getElementById('followup-body');
      if (textarea) copyToClipboard(textarea.value, 'Follow-up letter copied!');
    });
  }

  // --- Clipboard utility ---
  function copyToClipboard(text, message) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast(message);
      }).catch(function () {
        fallbackCopy(text, message);
      });
    } else {
      fallbackCopy(text, message);
    }
  }

  function fallbackCopy(text, message) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(message);
    } catch (e) {
      showToast('Could not copy. Please select and copy manually.');
    }
    document.body.removeChild(ta);
  }

  // --- Toast Notification ---
  function showToast(message) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('visible');
    });

    setTimeout(function () {
      toast.classList.remove('visible');
      setTimeout(function () { toast.remove(); }, 300);
    }, 2500);
  }

})();
