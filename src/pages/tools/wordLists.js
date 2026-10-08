// Saare word lists yahan rakho. Ek jagah, easy to maintain.

export const COUNTRIES_WORDS = `
afghanistan
albania
algeria
andorra
angola
antigua and barbuda
argentina
armenia
australia
austria
azerbaijan
bahamas
bahrain
bangladesh
barbados
belarus
belgium
belize
benin
bhutan
bolivia
bosnia herzegovina
botswana
brazil
brunei
bulgaria
burkina faso
burundi
cambodia
cameroon
canada
cape verde
central african republic
chad
chile
china
colombia
comoros
republic of congo
democratic republic of congo
costa rica
cote d ivoire
croatia
cuba
cyprus
czechia
denmark
djibouti
dominica
dominican republic
ecuador
egypt
el salvador
equatorial guinea
eritrea
estonia
eswatini
ethiopia
fiji
finland
france
gabon
gambia
georgia
germany
ghana
greece
grenada
guatemala
guinea
guinea-bissau
guyana
haiti
honduras
hungary
iceland
india
indonesia
iran
iraq
ireland
israel
italy
jamaica
japan
jordan
kazakhstan
kenya
kiribati
republic of korea
north korea
kosovo
kuwait
kyrgyzstan
laos
latvia
lebanon
lesotho
liberia
libya
liechtenstein
lithuania
luxembourg
madagascar
malawi
malaysia
maldives
mali
malta
marshall islands
mauritania
mauritius
mexico
micronesia
moldova
monaco
mongolia
montenegro
morocco
mozambique
myanmar
namibia
nauru
nepal
netherlands
new zealand
nicaragua
niger
nigeria
north macedonia
norway
oman
pakistan
palau
palestine
panama
papua new guinea
paraguay
peru
philippines
poland
portugal
qatar
romania
russia
rwanda
saint kitts and nevis
saint lucia
saint vincent and the grenadines
samoa
san marino
sao tome and principe
saudi arabia
senegal
serbia
seychelles
sierra leone
singapore
slovakia
slovenia
solomon islands
somalia
south africa
south sudan
spain
sri lanka
sudan
suriname
sweden
switzerland
syria
taiwan
tajikistan
tanzania
thailand
east timor
togo
tonga
trinidad and tobago
tunisia
turkey
turkmenistan
tuvalu
uganda
ukraine
uae
uk
usa
uruguay
uzbekistan
vanuatu
vatican city
venezuela
vietnam
yemen
zambia
zimbabwe
`;

export const BIHAR_DISTRICTS_WORDS = `
araria
arwal
aurangabad
banka
begusarai
bhagalpur
bhojpur
buxar
darbhanga
east champaran
gaya
gopalganj
jamui
jehanabad
kaimur
katihar
khagaria
kishanganj
lakhisarai
madhepura
madhubani
munger
muzaffarpur
nalanda
nawada
patna
purnia
rohtas
saharsa
samastipur
saran
sheikhpura
sheohar
sitamarhi
siwan
supaul
vaishali
west champaran
`;

// Registry: naya word list add karna = bas yahan ek entry
export const WORD_LISTS = {
  countries: COUNTRIES_WORDS,
  bihar: BIHAR_DISTRICTS_WORDS,
};

// Helper: string ko clean array me convert karta hai
export function parseWords(raw) {
  return raw
    .split(/[\n\r,]+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0);
}