/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./app/**/*.{ts,tsx,js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        // Britney
        'britney-light': ['Britney-Light'],
        'britney': ['Britney'],
        'britney-bold': ['Britney-Bold'],
        'britney-ultra': ['Britney-Ultra'],

        // CabinetGrotesk
        'cabinet-thin': ['CabinetGrotesk-Thin'],
        'cabinet-extralight': ['CabinetGrotesk-Extralight'],
        'cabinet-light': ['CabinetGrotesk-Light'],
        'cabinet': ['CabinetGrotesk'],
        'cabinet-medium': ['CabinetGrotesk-Medium'],
        'cabinet-bold': ['CabinetGrotesk-Bold'],
        'cabinet-extrabold': ['CabinetGrotesk-Extrabold'],
        'cabinet-black': ['CabinetGrotesk-Black'],

        // Chillax
        'chillax-extralight': ['Chillax-Extralight'],
        'chillax-light': ['Chillax-Light'],
        'chillax': ['Chillax'],
        'chillax-medium': ['Chillax-Medium'],
        'chillax-semibold': ['Chillax-Semibold'],
        'chillax-bold': ['Chillax-Bold'],

        // ClashDisplay
        'clash-extralight': ['ClashDisplay-Extralight'],
        'clash-light': ['ClashDisplay-Light'],
        'clash': ['ClashDisplay'],
        'clash-medium': ['ClashDisplay-Medium'],
        'clash-semibold': ['ClashDisplay-Semibold'],
        'clash-bold': ['ClashDisplay-Bold'],

        // Melodrama
        'melodrama-light': ['Melodrama-Light'],
        'melodrama': ['Melodrama'],
        'melodrama-medium': ['Melodrama-Medium'],
        'melodrama-semibold': ['Melodrama-Semibold'],
        'melodrama-bold': ['Melodrama-Bold'],

        // Nippo
        'nippo-extralight': ['Nippo-Extralight'],
        'nippo-light': ['Nippo-Light'],
        'nippo': ['Nippo'],
        'nippo-medium': ['Nippo-Medium'],
        'nippo-bold': ['Nippo-Bold'],

        // Outfit
        'outfit-thin': ['Outfit-Thin'],
        'outfit-extralight': ['Outfit-ExtraLight'],
        'outfit-light': ['Outfit-Light'],
        'outfit': ['Outfit'],
        'outfit-medium': ['Outfit-Medium'],
        'outfit-semibold': ['Outfit-SemiBold'],
        'outfit-bold': ['Outfit-Bold'],
        'outfit-extrabold': ['Outfit-ExtraBold'],
        'outfit-black': ['Outfit-Black'],

        // Panchang
        'panchang-extralight': ['Panchang-Extralight'],
        'panchang-light': ['Panchang-Light'],
        'panchang': ['Panchang'],
        'panchang-medium': ['Panchang-Medium'],
        'panchang-semibold': ['Panchang-Semibold'],
        'panchang-bold': ['Panchang-Bold'],
        'panchang-extrabold': ['Panchang-Extrabold'],

        // Poppins
        'poppins-thin': ['Poppins-Thin'],
        'poppins-extralight': ['Poppins-ExtraLight'],
        'poppins-light': ['Poppins-Light'],
        'poppins': ['Poppins'],
        'poppins-medium': ['Poppins-Medium'],
        'poppins-semibold': ['Poppins-SemiBold'],
        'poppins-bold': ['Poppins-Bold'],
        'poppins-extrabold': ['Poppins-ExtraBold'],
        'poppins-black': ['Poppins-Black'],
        // Poppins Italics
        'poppins-thin-italic': ['Poppins-ThinItalic'],
        'poppins-extralight-italic': ['Poppins-ExtraLightItalic'],
        'poppins-light-italic': ['Poppins-LightItalic'],
        'poppins-italic': ['Poppins-Italic'],
        'poppins-medium-italic': ['Poppins-MediumItalic'],
        'poppins-semibold-italic': ['Poppins-SemiBoldItalic'],
        'poppins-bold-italic': ['Poppins-BoldItalic'],
        'poppins-extrabold-italic': ['Poppins-ExtraBoldItalic'],
        'poppins-black-italic': ['Poppins-BlackItalic'],

        // Satoshi
        'satoshi-light': ['Satoshi-Light'],
        'satoshi': ['Satoshi'],
        'satoshi-medium': ['Satoshi-Medium'],
        'satoshi-bold': ['Satoshi-Bold'],
        'satoshi-black': ['Satoshi-Black'],
        'satoshi-light-italic': ['Satoshi-LightItalic'],
        'satoshi-italic': ['Satoshi-Italic'],
        'satoshi-medium-italic': ['Satoshi-MediumItalic'],
        'satoshi-bold-italic': ['Satoshi-BoldItalic'],
        'satoshi-black-italic': ['Satoshi-BlackItalic'],

        // Sentient
        'sentient-extralight': ['Sentient-Extralight'],
        'sentient-light': ['Sentient-Light'],
        'sentient': ['Sentient'],
        'sentient-medium': ['Sentient-Medium'],
        'sentient-bold': ['Sentient-Bold'],
        'sentient-extralight-italic': ['Sentient-ExtralightItalic'],
        'sentient-light-italic': ['Sentient-LightItalic'],
        'sentient-italic': ['Sentient-Italic'],
        'sentient-medium-italic': ['Sentient-MediumItalic'],
        'sentient-bold-italic': ['Sentient-BoldItalic'],

        // Supreme
        'supreme-thin': ['Supreme-Thin'],
        'supreme-extralight': ['Supreme-Extralight'],
        'supreme-light': ['Supreme-Light'],
        'supreme': ['Supreme'],
        'supreme-medium': ['Supreme-Medium'],
        'supreme-bold': ['Supreme-Bold'],
        'supreme-extrabold': ['Supreme-Extrabold'],
        'supreme-thin-italic': ['Supreme-ThinItalic'],
        'supreme-extralight-italic': ['Supreme-ExtralightItalic'],
        'supreme-light-italic': ['Supreme-LightItalic'],
        'supreme-italic': ['Supreme-Italic'],
        'supreme-medium-italic': ['Supreme-MediumItalic'],
        'supreme-bold-italic': ['Supreme-BoldItalic'],
        'supreme-extrabold-italic': ['Supreme-ExtraboldItalic'],

        // Technor
        'technor-extralight': ['Technor-Extralight'],
        'technor-light': ['Technor-Light'],
        'technor': ['Technor'],
        'technor-medium': ['Technor-Medium'],
        'technor-semibold': ['Technor-Semibold'],
        'technor-bold': ['Technor-Bold'],
        'technor-black': ['Technor-Black'],

        // Teko
        'teko-light': ['Teko-Light'],
        'teko': ['Teko'],
        'teko-medium': ['Teko-Medium'],
        'teko-semibold': ['Teko-SemiBold'],
        'teko-bold': ['Teko-Bold'],

        // Telma
        'telma-light': ['Telma-Light'],
        'telma': ['Telma'],
        'telma-medium': ['Telma-Medium'],
        'telma-bold': ['Telma-Bold'],
        'telma-black': ['Telma-Black'],
      },
    },
  },
  plugins: [],
}
