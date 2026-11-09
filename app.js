"use strict";

(() => {
  const API_ENDPOINT = document.documentElement.dataset.leadApi ?? "/api/lead";

  const select = (selector, root = document) => root.querySelector(selector);
  const selectAll = (selector, root = document) => [...root.querySelectorAll(selector)];

  /* Mobile navigation */

  const menuToggle = select(".menu-toggle");
  const mainNav = select("#main-nav");

  if (menuToggle && mainNav) {
    const closeMenu = () => {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Открыть меню");
      mainNav.classList.remove("is-open");
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";

      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute(
        "aria-label",
        isOpen ? "Открыть меню" : "Закрыть меню"
      );
      mainNav.classList.toggle("is-open", !isOpen);
    });

    selectAll("a", mainNav).forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
        menuToggle.focus();
      }
    });

    document.addEventListener("click", (event) => {
      if (
        menuToggle.getAttribute("aria-expanded") === "true" &&
        !mainNav.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        closeMenu();
      }
    });

    const mobileQuery = window.matchMedia("(min-width: 761px)");
    mobileQuery.addEventListener("change", (event) => {
      if (event.matches) closeMenu();
    });
  }

  /* Current year */

  const yearElement = select("#current-year");
  if (yearElement) {
    yearElement.textContent = String(new Date().getFullYear());
  }

  /* Premium motion system */

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  if ("IntersectionObserver" in window && !motionQuery.matches) {
    const motionTargets = selectAll(
      ".intro-heading, .solution-feature, .solution-row, .work-heading, .work-card, .detail-copy, .detail-visual, .process-heading, .process-item, .quiz-layout, .faq-item, .contact-layout"
    );

    const motionObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("motion-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" }
    );

    motionTargets.forEach((element, index) => {
      element.classList.add("motion-item");
      element.style.setProperty("--motion-delay", `${Math.min(index % 4, 3) * 85}ms`);
      motionObserver.observe(element);
    });
  }

  /* Phone input */

  const formatPhone = (value) => {
    let digits = value.replace(/\D/g, "");

    if (!digits) return "";

    if (digits.startsWith("8") && digits.length === 11) {
      digits = `7${digits.slice(1)}`;
    } else if (digits.startsWith("9")) {
      digits = `7${digits}`;
    }

    if (digits.startsWith("7")) {
      digits = digits.slice(0, 11);
      const rest = digits.slice(1);
      let formatted = "+7";

      if (rest.length > 0) formatted += ` (${rest.slice(0, 3)}`;
      if (rest.length >= 3) formatted += ")";
      if (rest.length > 3) formatted += ` ${rest.slice(3, 6)}`;
      if (rest.length > 6) formatted += `-${rest.slice(6, 8)}`;
      if (rest.length > 8) formatted += `-${rest.slice(8, 10)}`;

      return formatted;
    }

    return `+${digits.slice(0, 15)}`;
  };

  const getPhoneDigits = (value) => value.replace(/\D/g, "");

  selectAll('input[type="tel"]').forEach((input) => {
    input.addEventListener("input", () => {
      const formatted = formatPhone(input.value);
      input.value = formatted;
      input.removeAttribute("aria-invalid");
    });
  });

  /* Form helpers */

  const setStatus = (form, message, state = "") => {
    const status = select(".form-status", form);
    if (!status) return;

    status.textContent = message;
    if (state) {
      status.dataset.state = state;
    } else {
      delete status.dataset.state;
    }
  };

  const setFieldError = (field, message) => {
    if (!field) return;

    field.setAttribute("aria-invalid", "true");

    const errorId = `${field.id}-error`;
    let error = select(`#${CSS.escape(errorId)}`);

    if (!error) {
      error = document.createElement("span");
      error.id = errorId;
      error.className = "field-error";
      error.setAttribute("role", "alert");
      field.insertAdjacentElement("afterend", error);
    }

    error.textContent = message;
    field.setAttribute("aria-describedby", errorId);
  };

  const clearFieldError = (field) => {
    if (!field) return;

    field.removeAttribute("aria-invalid");

    const errorId = `${field.id}-error`;
    const error = select(`#${CSS.escape(errorId)}`);

    if (error) error.remove();

    field.removeAttribute("aria-describedby");
  };

  const validatePhone = (input) => {
    if (!input) return false;

    const digits = getPhoneDigits(input.value);

    if (digits.length < 10 || digits.length > 15) {
      setFieldError(
        input,
        "Укажите корректный номер телефона с кодом страны."
      );
      return false;
    }

    clearFieldError(input);
    return true;
  };

  const validateRequiredField = (input, message) => {
    if (!input) return true;

    if (!input.value.trim()) {
      setFieldError(input, message);
      return false;
    }

    clearFieldError(input);
    return true;
  };

  selectAll("input, textarea, select").forEach((field) => {
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") {
        clearFieldError(field);
      }
    });

    field.addEventListener("change", () => {
      if (field.getAttribute("aria-invalid") === "true") {
        clearFieldError(field);
      }
    });
  });

  /* Lead submission */

  const submitLead = async (form, payload, submitButton) => {
    if (form.dataset.submitting === "true") return;

    if (!API_ENDPOINT) {
      setStatus(
        form,
        "Онлайн-отправка заявок пока не подключена. Позвоните нам или воспользуйтесь контактами на сайте.",
        "error"
      );
      return false;
    }

    form.dataset.submitting = "true";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalLabel = submitButton.innerHTML;
      submitButton.textContent = "Отправляем…";
    }

    setStatus(form, "Передаём заявку…");

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      let result;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        const message =
          result && typeof result.error === "string"
            ? result.error
            : "Сервер не принял заявку. Попробуйте ещё раз.";

        throw new Error(message);
      }

      if (!result || result.success !== true) {
        throw new Error(
          "Сервер не подтвердил получение заявки. Повторите отправку."
        );
      }

      setStatus(
        form,
        result.message || "Заявка получена. Мы свяжемся с вами.",
        "success"
      );

      form.reset();

      form.dispatchEvent(
        new CustomEvent("lead:success", {
          bubbles: true,
          detail: { requestId: result.requestId || null }
        })
      );

      return true;
    } catch (error) {
      setStatus(
        form,
        error instanceof TypeError
          ? "Не удалось связаться с сервером. Проверьте подключение и повторите отправку."
          : error.message,
        "error"
      );

      return false;
    } finally {
      delete form.dataset.submitting;

      if (submitButton) {
        submitButton.disabled = false;

        if (submitButton.dataset.originalLabel) {
          submitButton.innerHTML = submitButton.dataset.originalLabel;
          delete submitButton.dataset.originalLabel;
        }
      }
    }
  };

  /* Contact form */

  const contactForm = select("#request-form");

  if (contactForm) {
    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const nameInput = select('[name="name"]', contactForm);
      const phoneInput = select('[name="phone"]', contactForm);
      const consentInput = select('[name="consent"]', contactForm);
      const messageInput = select('[name="message"]', contactForm);
      const submitButton = select('button[type="submit"]', contactForm);

      const nameValid = validateRequiredField(
        nameInput,
        "Укажите ваше имя."
      );
      const phoneValid = validatePhone(phoneInput);

      if (!consentInput.checked) {
        setStatus(
          contactForm,
          "Для отправки заявки необходимо согласие на обработку персональных данных.",
          "error"
        );
        consentInput.focus();
        return;
      }

      if (!nameValid || !phoneValid) {
        setStatus(
          contactForm,
          "Проверьте поля, отмеченные ошибкой.",
          "error"
        );

        if (!nameValid) nameInput.focus();
        else phoneInput.focus();

        return;
      }

      const payload = {
        source: "contact-form",
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        message: messageInput.value.trim(),
        consent: true,
        page: window.location.href
      };

      await submitLead(contactForm, payload, submitButton);
    });
  }

  /* Multi-step quiz */

  const quizForm = select("#quiz-form");

  if (quizForm) {
    const steps = selectAll(".quiz-step", quizForm);
    const backButton = select("#quiz-back", quizForm);
    const nextButton = select("#quiz-next", quizForm);
    const submitButton = select("#quiz-submit", quizForm);
    const stepLabel = select("#quiz-step-label");
    const progressLabel = select("#quiz-progress-label");
    const progressBar = select("#quiz-progress");
    const cityOther = select("#quiz-city-other");

    let currentStep = 0;

    const totalSteps = steps.length;

    const updateQuiz = () => {
      steps.forEach((step, index) => {
        const active = index === currentStep;
        step.hidden = !active;
        step.classList.toggle("is-active", active);
      });

      const percentage = Math.round(
        ((currentStep + 1) / totalSteps) * 100
      );

      stepLabel.textContent =
        `Шаг ${String(currentStep + 1).padStart(2, "0")} из ${String(totalSteps).padStart(2, "0")}`;

      progressLabel.textContent = `${percentage}%`;
      progressBar.style.width = `${percentage}%`;

      backButton.hidden = currentStep === 0;
      nextButton.hidden = currentStep === totalSteps - 1;
      submitButton.hidden = currentStep !== totalSteps - 1;

      setStatus(quizForm, "");
    };

    const showQuizError = (key, message) => {
      const error = select(`[data-error="${key}"]`, quizForm);

      if (error) error.textContent = message;
    };

    const validateStep = () => {
      const current = steps[currentStep];

      if (currentStep === 0) {
        const selected = selectAll(
          'input[name="services"]:checked',
          current
        );

        if (selected.length === 0) {
          showQuizError("services", "Выберите хотя бы один вариант.");
          return false;
        }

        showQuizError("services", "");
        return true;
      }

      if (currentStep === 1) {
        const city = select('input[name="city"]:checked', current);

        if (!city) {
          showQuizError("city", "Выберите город.");
          return false;
        }

        if (
          city.value === "Другой город КМВ" &&
          !cityOther.value.trim()
        ) {
          setFieldError(
            cityOther,
            "Укажите населённый пункт."
          );
          cityOther.focus();
          return false;
        }

        clearFieldError(cityOther);
        showQuizError("city", "");
        return true;
      }

      if (currentStep === 2) {
        const stage = select('input[name="stage"]:checked', current);

        if (!stage) {
          showQuizError("stage", "Выберите этап ремонта.");
          return false;
        }

        showQuizError("stage", "");
        return true;
      }

      if (currentStep === 3) {
        const nameInput = select('[name="name"]', current);
        const phoneInput = select('[name="phone"]', current);
        const consentInput = select('[name="consent"]', current);

        const nameValid = validateRequiredField(
          nameInput,
          "Укажите ваше имя."
        );

        const phoneValid = validatePhone(phoneInput);

        if (!consentInput.checked) {
          showQuizError(
            "contact",
            "Необходимо согласие на обработку персональных данных."
          );
          consentInput.focus();
          return false;
        }

        if (!nameValid || !phoneValid) {
          showQuizError("contact", "Проверьте контактные данные.");

          if (!nameValid) nameInput.focus();
          else phoneInput.focus();

          return false;
        }

        showQuizError("contact", "");
        return true;
      }

      return false;
    };

    nextButton.addEventListener("click", () => {
      if (!validateStep()) return;

      if (currentStep < totalSteps - 1) {
        currentStep += 1;
        updateQuiz();

        const legend = select("legend", steps[currentStep]);
        if (legend) {
          legend.setAttribute("tabindex", "-1");
          legend.focus();
        }
      }
    });

    backButton.addEventListener("click", () => {
      if (currentStep > 0) {
        currentStep -= 1;
        updateQuiz();

        const legend = select("legend", steps[currentStep]);
        if (legend) {
          legend.setAttribute("tabindex", "-1");
          legend.focus();
        }
      }
    });

    quizForm.addEventListener("change", (event) => {
      const target = event.target;

      if (
        target.matches('input[name="services"]') &&
        selectAll('input[name="services"]:checked', quizForm).length
      ) {
        showQuizError("services", "");
      }

      if (target.matches('input[name="city"]')) {
        showQuizError("city", "");
        clearFieldError(cityOther);
      }

      if (target.matches('input[name="stage"]')) {
        showQuizError("stage", "");
      }

      if (target.matches('[name="consent"]') && target.checked) {
        showQuizError("contact", "");
      }
    });

    quizForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (currentStep !== totalSteps - 1) return;
      if (!validateStep()) return;

      const formData = new FormData(quizForm);

      const services = formData.getAll("services");
      const selectedCity = formData.get("city");
      const city =
        selectedCity === "Другой город КМВ"
          ? formData.get("cityOther").trim()
          : selectedCity;

      const payload = {
        source: "quiz",
        name: formData.get("name").trim(),
        phone: formData.get("phone").trim(),
        services,
        city,
        stage: formData.get("stage"),
        consent: true,
        page: window.location.href
      };

      const sent = await submitLead(
        quizForm,
        payload,
        submitButton
      );

      if (sent) {
        currentStep = 0;
        updateQuiz();
      }
    });

    updateQuiz();
  }

  /* FAQ: keep the reading flow compact */

  const faqItems = selectAll(".faq-item");

  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;

      faqItems.forEach((other) => {
        if (other !== item && other.open) {
          other.open = false;
        }
      });
    });
  });
})();
