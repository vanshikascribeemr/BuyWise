export function isAccessory(titleText: string, searchKeywords: string): boolean {
  if (!titleText) return false;
  
  const searchLower = searchKeywords.toLowerCase();
  const textLower = titleText.toLowerCase();

  // List of common accessory identifiers
  const accessories = [
    'cover', 'case', 'protector', 'screen guard', 'tempered glass',
    'cable', 'charger', 'adapter', 'skin', 'strap', 'band', 'stand', 'mount',
    'back cover', 'flip cover', 'silicone case', 'earbuds case', 'bumper',
    'transparent case', 'protector glass'
  ];

  // If the user explicitly searched for an accessory, do not filter it out
  for (const kw of accessories) {
    if (searchLower.includes(kw)) return false;
  }

  // Check if the text explicitly mentions accessories
  for (const kw of accessories) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(textLower)) return true;
  }

  return false;
}
