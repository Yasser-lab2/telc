export function buildWhatsAppURL(
  phoneNumber: string,
  planName: string,
  priceMad: number,
  paymentId: string,
  cihAccount: string,
): string {
  const message = encodeURIComponent(
    `Salam,\n` +
      `bghit nchri ${planName} b ${priceMad} MAD.\n\n` +
      `Compte CIH: ${cihAccount}\n` +
      `Payment ID: ${paymentId}\n\n` +
      `Ghadi nsift lik screenshot dyal virement.`,
  );
  return `https://wa.me/${phoneNumber}?text=${message}`;
}
