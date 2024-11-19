const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Função para buscar o título do manga e o número do capítulo
async function getMangaDetails(chapterId) {
    try {
        const response = await axios.get(`https://api.mangadex.org/chapter/${chapterId}`);
        const mangaId = response.data.data.relationships.find(r => r.type === 'manga').id;
        const chapterNumber = response.data.data.attributes.chapter;

        // Buscar o título do manga
        const mangaResponse = await axios.get(`https://api.mangadex.org/manga/${mangaId}`);
        const mangaTitle = mangaResponse.data.data.attributes.title.en || mangaResponse.data.data.attributes.title.jp;

        return { mangaTitle, chapterNumber };
    } catch (error) {
        console.error('Erro ao buscar detalhes do manga:', error);
    }
}

// Função para buscar as URLs das imagens
async function getChapterImages(chapterId) {
    try {
        const response = await axios.get(`https://api.mangadex.org/at-home/server/${chapterId}`);
        const baseUrl = response.data.baseUrl;
        const chapterHash = response.data.chapter.hash;
        const imageUrls = response.data.chapter.data; // Usando a qualidade original
        const imageSaverUrls = response.data.chapter.dataSaver; // Usando a qualidade compactada

        console.log(`Base URL: ${baseUrl}`);
        console.log(`Chapter Hash: ${chapterHash}`);

        // Construir as URLs das imagens
        const originalImageUrls = imageUrls.map((filename) => `${baseUrl}/data/${chapterHash}/${filename}`);
        const compressedImageUrls = imageSaverUrls.map((filename) => `${baseUrl}/data-saver/${chapterHash}/${filename}`);

        return { originalImageUrls, compressedImageUrls };
    } catch (error) {
        console.error('Erro ao buscar as imagens:', error);
    }
}

// Função para baixar as imagens
async function downloadImages(urls, folderPath) {
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const fileName = path.basename(url);
        const filePath = path.join(folderPath, fileName);

        try {
            const response = await axios.get(url, { responseType: 'stream' });
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            writer.on('finish', () => {
                console.log(`Imagem ${fileName} baixada com sucesso!`);
            });

            writer.on('error', (err) => {
                console.error(`Erro ao baixar a imagem ${fileName}:`, err);
            });
        } catch (error) {
            console.error('Erro ao baixar a imagem:', error);
        }
    }
}

// Função para criar pasta específica para cada manga com título e capítulo
function createMangaFolder(mangaTitle, chapterNumber) {
    const folderName = `${mangaTitle.replace(/\s+/g, '_').toLowerCase()}_capitulo_${chapterNumber}`; // Substitui espaços por _ e usa minúsculas
    const mangaFolderPath = path.join('./mangas', folderName); // Cria a pasta com o nome do manga e número do capítulo

    if (!fs.existsSync(mangaFolderPath)) {
        fs.mkdirSync(mangaFolderPath, { recursive: true });
    }
    return mangaFolderPath;
}

// Exemplo de uso
const chapterId = 'b61beaed-21d5-4d5b-aeb1-73c1c31ab862';  // Substitua com o ID do capítulo desejado

// Buscar os detalhes do manga (título e capítulo)
getMangaDetails(chapterId).then(({ mangaTitle, chapterNumber }) => {
    // Criar a pasta para armazenar as imagens do capítulo
    const folderPath = createMangaFolder(mangaTitle, chapterNumber);

    // Buscar URLs das imagens e baixar
    getChapterImages(chapterId).then(({ originalImageUrls, compressedImageUrls }) => {
        console.log('Baixando imagens de qualidade original...');
        downloadImages(originalImageUrls, folderPath);
    });
});
