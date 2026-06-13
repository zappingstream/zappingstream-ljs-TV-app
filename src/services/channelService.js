const API_URL = 'https://zappingstream-api.vercel.app/channels';

export const getChannels = async () => {
    try {
        // 4. Obtener el token validado por reCAPTCHA
        // Ejemplo de cómo podrías obtenerlo (dependerá de la librería que uses):
        // const token = await getRecaptchaToken();

        // 5. Adjuntar el token en los headers de tu fetch original
        const response = await fetch(API_URL);


        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();

        if (!data) {
            return [];
        }

        // Recorremos los canales y filtramos los videos internos con ToBeCut = true
        return data.map(channel => {
            const filterVideos = (videos) => {
                if (!videos) return videos;
                // Soportar tanto arrays como diccionarios (objetos)
                if (Array.isArray(videos)) {
                    return videos.filter((v) => v.ToBeCut !== true);
                }

                const result = {};
                Object.keys(videos).forEach(key => {
                    if (videos[key].ToBeCut !== true) {
                        result[key] = videos[key];
                    }
                });
                return result;
            };

            return {
                ...channel,
                Actives: filterVideos(channel.Actives),
                Upcoming: filterVideos(channel.Upcoming),
                Past: filterVideos(channel.Past)
            };
        });

    } catch (error) {
        console.error("Error al obtener los canales:", error);
        throw error;
    }
};