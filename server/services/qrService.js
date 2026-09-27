import QRCode from 'qrcode';

export const generateLocomotiveQR = async (locomotive) => {
  const payload = JSON.stringify({
    system: 'RailReady',
    locoNumber: locomotive.locoNumber,
    locoClass: locomotive.locoClass,
    shed: locomotive.shed,
    status: locomotive.status,
    verificationUrl: `/locomotives/${locomotive._id}`
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
    return qrDataUrl;
  } catch (err) {
    throw new Error(`QR generation failed: ${err.message}`);
  }
};
