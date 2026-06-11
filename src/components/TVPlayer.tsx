import { useEffect, useRef } from 'react';
import './TVPlayer.css';

interface TVPlayerProps {
    videoId: string;
    onClose: () => void;
}

export const TVPlayer = ({ videoId, onClose }: TVPlayerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);

    // Mantenemos la referencia de onClose actualizada sin reiniciar el effect principal
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        containerRef.current?.focus();

        // Capturar el botón "Atrás" físico (Hardware Back Button) de Android TV/Smart TV
        // Empujamos un estado falso en el historial al abrir el reproductor
        window.history.pushState({ tvPlayerOpen: true }, '');

        const handlePopState = () => {
            // Al presionar el botón "Atrás" físico del control, el sistema vuelve atrás en el historial y se dispara este evento
            onCloseRef.current();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    const handleManualClose = () => {
        // Si cerramos presionando el botón "Atrás / Esc" de la UI (con OK/Enter) o la tecla Escape del teclado
        // forzamos el retroceso manual para limpiar el historial, lo cual dispara popstate y cierra todo.
        window.history.back();
    };

    return (
        <div 
            className="tv-player-overlay" 
            ref={containerRef} 
            tabIndex={0} 
            onKeyDown={(e) => {
                if (e.key === 'Escape' || e.key === 'Backspace') {
                    handleManualClose();
                }
            }}
        >
            <button className="tv-close-btn" onClick={handleManualClose} autoFocus>
                Atrás / Esc para salir
            </button>
            <iframe
                className="tv-iframe"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&fs=1&modestbranding=1&rel=0`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            ></iframe>
        </div>
    );
};