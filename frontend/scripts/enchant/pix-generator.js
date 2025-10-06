// pix-generator.js
function gerarPixCopiaECola(config) {
    const {
        pixKey,
        merchantName,
        merchantCity,
        transactionAmount,
        infoAdicional = ''
    } = config;

    // Função auxiliar para criar campos do PIX
    function criarCampo(id, valor) {
        const tamanho = valor.length.toString().padStart(2, '0');
        return `${id}${tamanho}${valor}`;
    }

    // Monta o payload
    let payload = '';
    payload += criarCampo('00', '01'); // Payload Format Indicator
    payload += criarCampo('26', criarCampo('00', 'BR.GOV.BCB.PIX') + criarCampo('01', pixKey)); // Merchant Account
    payload += criarCampo('52', '0000'); // Merchant Category Code
    payload += criarCampo('53', '986'); // Currency (BRL)

    if (transactionAmount) {
        payload += criarCampo('54', transactionAmount.toFixed(2));
    }

    payload += criarCampo('58', 'BR'); // Country Code
    payload += criarCampo('59', merchantName); // Merchant Name
    payload += criarCampo('60', merchantCity); // Merchant City

    if (infoAdicional) {
        payload += criarCampo('62', criarCampo('05', infoAdicional));
    }

    payload += '6304'; // CRC placeholder

    // Calcula CRC16
    const crc = calcularCRC16(payload);
    payload += crc;

    return payload;
}

function calcularCRC16(str) {
    const polynomial = 0x1021;
    let crc = 0xFFFF;

    for (let i = 0; i < str.length; i++) {
        crc ^= (str.charCodeAt(i) << 8);
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ polynomial) : (crc << 1);
        }
    }

    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}