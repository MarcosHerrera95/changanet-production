/**
 * Hook personalizado para accesibilidad WCAG 2.1 AA en Changánet
 * Implementa validaciones automáticas y mejoras de accesibilidad
 */

import { useEffect, useState, useCallback } from 'react';

/**
 * Hook principal de accesibilidad
 */
export function useAccessibility() {
  const [violations, setViolations] = useState([]);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [reducedMotion, setReducedMotion] = useState(false);

  /**
   * Detectar preferencias del usuario
   */
  useEffect(() => {
    // Detectar modo de alto contraste
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleContrastChange = (e) => setIsHighContrast(e.matches);
    mediaQuery.addEventListener('change', handleContrastChange);

    // Detectar preferencia de movimiento reducido
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery.matches);

    const handleMotionChange = (e) => setReducedMotion(e.matches);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      mediaQuery.removeEventListener('change', handleContrastChange);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  /**
   * Validar contraste de colores
   */
  const validateColorContrast = useCallback((foreground, background) => {
    // Función para convertir hex a RGB
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    // Calcular luminancia relativa
    const getRelativeLuminance = (rgb) => {
      const { r, g, b } = rgb;
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const fgRgb = hexToRgb(foreground);
    const bgRgb = hexToRgb(background);

    if (!fgRgb || !bgRgb) return null;

    const l1 = getRelativeLuminance(fgRgb);
    const l2 = getRelativeLuminance(bgRgb);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    const ratio = (lighter + 0.05) / (darker + 0.05);

    // WCAG AA requiere ratio >= 4.5 para texto normal, >= 3 para texto grande
    return {
      ratio: Math.round(ratio * 100) / 100,
      aa: ratio >= 4.5,
      aaa: ratio >= 7,
      largeText: ratio >= 3
    };
  }, []);

  /**
   * Validar elementos de accesibilidad
   */
  const validateAccessibility = useCallback((element) => {
    const newViolations = [];

    if (!element) return newViolations;

    // Validar imágenes sin alt
    const images = element.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.alt && !img.getAttribute('aria-hidden')) {
        newViolations.push({
          type: 'missing_alt',
          element: img,
          message: 'Imagen sin atributo alt',
          severity: 'error',
          wcag: '1.1.1'
        });
      }
    });

    // Validar botones sin texto accesible
    const buttons = element.querySelectorAll('button');
    buttons.forEach((button, index) => {
      const text = button.textContent?.trim() || button.getAttribute('aria-label') || '';
      if (!text && !button.getAttribute('aria-hidden')) {
        newViolations.push({
          type: 'button_no_text',
          element: button,
          message: 'Botón sin texto accesible',
          severity: 'error',
          wcag: '2.1.1'
        });
      }
    });

    // Validar inputs sin label
    const inputs = element.querySelectorAll('input, select, textarea');
    inputs.forEach((input, index) => {
      const id = input.id;
      const label = element.querySelector(`label[for="${id}"]`);
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');

      if (!label && !ariaLabel && !ariaLabelledBy && !input.getAttribute('aria-hidden')) {
        newViolations.push({
          type: 'input_no_label',
          element: input,
          message: 'Campo de formulario sin etiqueta',
          severity: 'error',
          wcag: '3.3.2'
        });
      }
    });

    // Validar headings saltados
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headingLevels = Array.from(headings).map(h => parseInt(h.tagName.charAt(1)));
    let lastLevel = 0;

    headingLevels.forEach((level, index) => {
      if (level - lastLevel > 1) {
        newViolations.push({
          type: 'heading_skip',
          element: headings[index],
          message: `Salto de heading: h${lastLevel} a h${level}`,
          severity: 'warning',
          wcag: '2.4.6'
        });
      }
      lastLevel = level;
    });

    // Validar enlaces sin texto descriptivo
    const links = element.querySelectorAll('a');
    links.forEach((link, index) => {
      const text = link.textContent?.trim() || link.getAttribute('aria-label') || '';
      if (!text && !link.getAttribute('aria-hidden')) {
        newViolations.push({
          type: 'link_no_text',
          element: link,
          message: 'Enlace sin texto descriptivo',
          severity: 'error',
          wcag: '2.4.4'
        });
      }
    });

    setViolations(newViolations);
    return newViolations;
  }, []);

  /**
   * Mejorar navegación por teclado
   */
  const enhanceKeyboardNavigation = useCallback(() => {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach((element, index) => {
      // Agregar indicadores visuales de foco
      element.addEventListener('focus', () => {
        element.style.outline = '3px solid #E30613';
        element.style.outlineOffset = '2px';
      });

      element.addEventListener('blur', () => {
        element.style.outline = '';
        element.style.outlineOffset = '';
      });

      // Mejorar navegación con flechas para elementos agrupados
      if (element.type === 'radio') {
        element.addEventListener('keydown', (e) => {
          const radios = Array.from(document.querySelectorAll(`input[name="${element.name}"]`));
          const currentIndex = radios.indexOf(element);

          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = (currentIndex + 1) % radios.length;
            radios[nextIndex].focus();
            radios[nextIndex].checked = true;
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = currentIndex === 0 ? radios.length - 1 : currentIndex - 1;
            radios[prevIndex].focus();
            radios[prevIndex].checked = true;
          }
        });
      }
    });
  }, []);

  /**
   * Gestionar tamaño de fuente
   */
  const increaseFontSize = useCallback(() => {
    setFontSize(prev => Math.min(prev + 2, 24)); // Máximo 24px
  }, []);

  const decreaseFontSize = useCallback(() => {
    setFontSize(prev => Math.max(prev - 2, 12)); // Mínimo 12px
  }, []);

  const resetFontSize = useCallback(() => {
    setFontSize(16);
  }, []);

  /**
   * Aplicar mejoras de accesibilidad al documento
   */
  useEffect(() => {
    // Aplicar tamaño de fuente
    document.documentElement.style.fontSize = `${fontSize}px`;

    // Aplicar modo de alto contraste si es necesario
    if (isHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    // Aplicar movimiento reducido
    if (reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }

    // Mejorar navegación por teclado
    enhanceKeyboardNavigation();

    // Validar accesibilidad inicial
    validateAccessibility(document.body);

    // Configurar observer para validar cambios dinámicos
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              validateAccessibility(node);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, [fontSize, isHighContrast, reducedMotion, validateAccessibility, enhanceKeyboardNavigation]);

  /**
   * Anunciar cambios para lectores de pantalla
   */
  const announceToScreenReader = useCallback((message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';

    document.body.appendChild(announcement);
    announcement.textContent = message;

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  /**
   * Gestionar foco programáticamente
   */
  const moveFocusTo = useCallback((element) => {
    if (element && typeof element.focus === 'function') {
      element.focus();
      announceToScreenReader(`Foco movido a ${element.textContent || element.getAttribute('aria-label') || 'elemento'}`);
    }
  }, [announceToScreenReader]);

  return {
    violations,
    isHighContrast,
    fontSize,
    reducedMotion,
    validateColorContrast,
    validateAccessibility,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    announceToScreenReader,
    moveFocusTo
  };
}

/**
 * Hook para gestión de foco
 */
export function useFocusManagement() {
  const [focusedElement, setFocusedElement] = useState(null);

  const setFocus = useCallback((element) => {
    if (element) {
      element.focus();
      setFocusedElement(element);
    }
  }, []);

  const trapFocus = useCallback((container) => {
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }

      if (e.key === 'Escape') {
        // Liberar foco del trap
        container.setAttribute('inert', '');
        document.body.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Enfocar primer elemento
    if (firstElement) {
      firstElement.focus();
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeAttribute('inert');
    };
  }, []);

  return {
    focusedElement,
    setFocus,
    trapFocus
  };
}

/**
 * Hook para gestión de ARIA
 */
export function useAriaManagement() {
  const updateAriaLabel = useCallback((element, label) => {
    if (element) {
      element.setAttribute('aria-label', label);
    }
  }, []);

  const updateAriaDescribedBy = useCallback((element, descriptionId) => {
    if (element) {
      element.setAttribute('aria-describedby', descriptionId);
    }
  }, []);

  const updateAriaExpanded = useCallback((element, expanded) => {
    if (element) {
      element.setAttribute('aria-expanded', expanded.toString());
    }
  }, []);

  const updateAriaHidden = useCallback((element, hidden) => {
    if (element) {
      element.setAttribute('aria-hidden', hidden.toString());
    }
  }, []);

  return {
    updateAriaLabel,
    updateAriaDescribedBy,
    updateAriaExpanded,
    updateAriaHidden
  };
}
