import { useEffect } from 'react';

export const useSpatialNavigation = () => {
    useEffect(() => {
        let lastFocusedElement: HTMLElement | null = null;

        const handleKeyDown = (e: KeyboardEvent) => {
            const keyMap: Record<string | number, string> = {
                'ArrowUp': 'UP', 'Up': 'UP',
                38: 'UP',
                'ArrowDown': 'DOWN', 'Down': 'DOWN',
                40: 'DOWN',
                'ArrowLeft': 'LEFT', 'Left': 'LEFT',
                37: 'LEFT',
                'ArrowRight': 'RIGHT', 'Right': 'RIGHT',
                39: 'RIGHT'
            };
            
            const direction = keyMap[e.key] || keyMap[e.keyCode];
            if (!direction) return;

            const activeElement = document.activeElement as HTMLElement;

            if (activeElement && activeElement.tagName === 'INPUT' && (direction === 'LEFT' || direction === 'RIGHT')) {
                return;
            }

            // BLOQUEO ABSOLUTO: Matamos el scroll nativo y cualquier otro evento de React
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const nodes = document.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
            const focusableElements = (Array.from(nodes) as HTMLElement[])
                .filter((el: HTMLElement) => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) return false;
                    
                    const style = window.getComputedStyle(el);
                    if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
                    if (el.closest('.hide-for-tv-player')) return false;
                    
                    return true;
                });

            if (focusableElements.length === 0) return;
            
            let currentEl = activeElement;

            if (!currentEl || currentEl === document.body || !focusableElements.includes(currentEl)) {
                if (lastFocusedElement && focusableElements.includes(lastFocusedElement)) {
                    currentEl = lastFocusedElement;
                } else {
                    let bestInitial: HTMLElement = focusableElements[0];
                    let minDist = Infinity;
                    focusableElements.forEach(el => {
                        const rect = el.getBoundingClientRect();
                        const dist = Math.abs(rect.top) + Math.abs(rect.left);
                        if (dist < minDist && rect.top >= 0 && rect.left >= 0) {
                            minDist = dist;
                            bestInitial = el;
                        }
                    });
                    currentEl = bestInitial;
                }
                currentEl.focus({ preventScroll: true });
                lastFocusedElement = currentEl;
                return;
            }

            const currentRect = currentEl.getBoundingClientRect();
            const currentCenter = {
                x: currentRect.left + currentRect.width / 2,
                y: currentRect.top + currentRect.height / 2
            };

            let bestMatch: HTMLElement | null = null;
            let minDistance = Infinity;

            focusableElements.forEach(el => {
                if (el === currentEl) return;

                const rect = el.getBoundingClientRect();
                const center = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };

                const dx = center.x - currentCenter.x;
                const dy = center.y - currentCenter.y;

                let isCandidate = false;
                if (direction === 'RIGHT' && dx > 0) isCandidate = true;
                if (direction === 'LEFT' && dx < 0) isCandidate = true;
                if (direction === 'DOWN' && dy > 0) isCandidate = true;
                if (direction === 'UP' && dy < 0) isCandidate = true;

                if (isCandidate) {
                    let mainAxis = (direction === 'LEFT' || direction === 'RIGHT') ? Math.abs(dx) : Math.abs(dy);
                    let crossAxis = (direction === 'LEFT' || direction === 'RIGHT') ? Math.abs(dy) : Math.abs(dx);

                    // Multiplicador agresivo para evitar saltos caóticos en diagonal
                    const distance = mainAxis + crossAxis * 10;

                    if (distance < minDistance) {
                        minDistance = distance;
                        bestMatch = el;
                    }
                }
            });

            if (bestMatch) {
                lastFocusedElement = bestMatch;
                (bestMatch as HTMLElement).focus({ preventScroll: true });
                // block: 'center' mantiene siempre el elemento enfocado cómodo en el centro de tu tele
                (bestMatch as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            }
        };

        // FASE DE CAPTURA EXTREMA: Intercepta las flechas antes de que el navegador calcule el scroll
        window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
        
        const autoFocusTimer = setTimeout(() => {
            if (!document.activeElement || document.activeElement === document.body) {
                const firstFocusable = document.querySelector('input, [tabindex]') as HTMLElement | null;
                if (firstFocusable) {
                    firstFocusable.focus({ preventScroll: true });
                    lastFocusedElement = firstFocusable;
                }
            }
        }, 1000);

        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            clearTimeout(autoFocusTimer);
        };
    }, []);
};