/*
 * Real venues, as a catalogue. Photos and one-line descriptions come from Wikipedia and Wikimedia Commons (licences
 * below; show the credit wherever a photo is shown). The 3D studio is a stylised venue of the matching kind
 * (palace courtyard, garden lawn, banquet hall), not a scan of the building.
 */
import type { VenueId } from "../decor.ts";

export interface VenueSite {
  id: string;
  name: string;
  city: string;
  /** Which 3D studio style it opens */
  style: VenueId;
  image: string;
  blurb: string;
  /** Wikipedia article */
  page: string;
  photo: { artist: string; licence: string; url: string };
}

export const VENUE_SITES: VenueSite[] = [
  {
    "id": "rambagh",
    "name": "Rambagh Palace",
    "city": "Jaipur",
    "style": "palace",
    "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Rambagh_Palace_hotel_Jaipur_lobby_courtyard.jpg/960px-Rambagh_Palace_hotel_Jaipur_lobby_courtyard.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
    "blurb": "The Rambagh Palace in Jaipur, Rajasthan is the former residence of the maharaja of Jaipur located 5 miles outside the walls of the city of Jaipur on Bhawani Singh Road.",
    "page": "https://en.wikipedia.org/wiki/Rambagh_Palace,_Jaipur",
    "photo": {
      "artist": "Chainwit.",
      "licence": "CC BY-SA 4.0",
      "url": "https://commons.wikimedia.org/wiki/File:Rambagh_Palace_hotel_Jaipur_lobby_courtyard.jpg"
    }
  },
  {
    "id": "umaid-bhawan",
    "name": "Umaid Bhawan Palace",
    "city": "Jodhpur",
    "style": "palace",
    "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/1996_-218-20A_Jodhpur_Hotel_Umaid_Bhawan_Palace_%282233393509%29.jpg/960px-1996_-218-20A_Jodhpur_Hotel_Umaid_Bhawan_Palace_%282233393509%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
    "blurb": "Umaid Bhawan Palace, located in Jodhpur, Rajasthan, India, is one of the world's largest private residences.",
    "page": "https://en.wikipedia.org/wiki/Umaid_Bhawan_Palace",
    "photo": {
      "artist": "Dan Lundberg",
      "licence": "CC BY-SA 2.0",
      "url": "https://commons.wikimedia.org/wiki/File:1996_-218-20A_Jodhpur_Hotel_Umaid_Bhawan_Palace_(2233393509).jpg"
    }
  },
  {
    "id": "lake-palace",
    "name": "Lake Palace",
    "city": "Udaipur",
    "style": "palace",
    "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/32/Udaipur_Lake_Palace.jpg/960px-Udaipur_Lake_Palace.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
    "blurb": "Lake Palace is a former summer palace of the royal dynasty of Mewar, now operated as a hotel.",
    "page": "https://en.wikipedia.org/wiki/Lake_Palace",
    "photo": {
      "artist": "user:Flicka",
      "licence": "CC BY-SA 3.0",
      "url": "https://commons.wikimedia.org/wiki/File:Udaipur_Lake_Palace.jpg"
    }
  },
  {
    "id": "city-palace-jaipur",
    "name": "City Palace",
    "city": "Jaipur",
    "style": "palace",
    "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Chandra_Mahal%2C_City_Palace%2C_Jaipur%2C_20191218_0951_9043.jpg/960px-Chandra_Mahal%2C_City_Palace%2C_Jaipur%2C_20191218_0951_9043.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
    "blurb": "The City Palace, Jaipur is a royal residence and former administrative headquarters of the rulers of the Jaipur State in Jaipur, Rajasthan.",
    "page": "https://en.wikipedia.org/wiki/City_Palace,_Jaipur",
    "photo": {
      "artist": "Jakub Hałun",
      "licence": "CC BY-SA 4.0",
      "url": "https://commons.wikimedia.org/wiki/File:Chandra_Mahal,_City_Palace,_Jaipur,_20191218_0951_9043.jpg"
    }
  },
  {
    "id": "samode",
    "name": "Samode Palace",
    "city": "Samode, Rajasthan",
    "style": "palace",
    "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/%E0%A6%B8%E0%A6%BE%E0%A6%AE%E0%A7%81%E0%A6%A1_%E0%A6%AA%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%B2%E0%A7%87%E0%A6%B8.jpg/960px-%E0%A6%B8%E0%A6%BE%E0%A6%AE%E0%A7%81%E0%A6%A1_%E0%A6%AA%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%B2%E0%A7%87%E0%A6%B8.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
    "blurb": "Samode Palace, Samode Haveli and Samode Bagh are heritage monuments and structures built by the noble feudatory with the hereditary title of 'Maha Rawal' or 'Maha Saheb’ of the Amber and Jaipur principality in Rajasthan, India.",
    "page": "https://en.wikipedia.org/wiki/Samode_Palace",
    "photo": {
      "artist": "Saifulislam09",
      "licence": "CC0",
      "url": "https://commons.wikimedia.org/wiki/File:%E0%A6%B8%E0%A6%BE%E0%A6%AE%E0%A7%81%E0%A6%A1_%E0%A6%AA%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%B2%E0%A7%87%E0%A6%B8.jpg"
    }
  },
  {
    "id": "chowmahalla",
    "name": "Chowmahalla Palace",
    "city": "Hyderabad",
    "style": "palace",
    "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/Chowmahalla_Palace_01.jpg/960px-Chowmahalla_Palace_01.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
    "blurb": "Chowmahalla Palace or Chowmahallat is the palace of the Nizams of Hyderabad State located in Hyderabad, Telangana, India.",
    "page": "https://en.wikipedia.org/wiki/Chowmahalla_Palace",
    "photo": {
      "artist": "Bernard Gagnon",
      "licence": "CC BY-SA 3.0",
      "url": "https://commons.wikimedia.org/wiki/File:Chowmahalla_Palace_01.jpg"
    }
  },
  {
    "id": "falaknuma",
    "name": "Falaknuma Palace",
    "city": "Hyderabad",
    "style": "banquet",
    "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Falaknuma_Palace_01.jpg/960px-Falaknuma_Palace_01.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
    "blurb": "Falaknuma Palace is a palace and a luxury hotel in Hyderabad, Telangana, India.",
    "page": "https://en.wikipedia.org/wiki/Falaknuma_Palace",
    "photo": {
      "artist": "Bernard Gagnon",
      "licence": "CC BY-SA 3.0",
      "url": "https://commons.wikimedia.org/wiki/File:Falaknuma_Palace_01.jpg"
    }
  },
  {
    "id": "taj-mumbai",
    "name": "Taj Mahal Palace",
    "city": "Mumbai",
    "style": "banquet",
    "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b3/Taj_Mahal_Palace_Hotel_photo.jpg/960px-Taj_Mahal_Palace_Hotel_photo.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
    "blurb": "The Taj Mahal Palace is a heritage, five-star, luxury hotel in the Colaba area of Mumbai, Maharashtra, India, situated next to the Gateway of India.",
    "page": "https://en.wikipedia.org/wiki/Taj_Mahal_Palace_Hotel",
    "photo": {
      "artist": "Photofinder.cr2",
      "licence": "CC BY-SA 4.0",
      "url": "https://commons.wikimedia.org/wiki/File:Taj_Mahal_Palace_Hotel_photo.jpg"
    }
  },
  {
    "id": "bengaluru-palace",
    "name": "Bengaluru Palace",
    "city": "Bengaluru",
    "style": "garden",
    "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Bangalore_Mysore_Maharaja_Palace.jpg/960px-Bangalore_Mysore_Maharaja_Palace.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
    "blurb": "Bengaluru Palace is a 19th-century royal palace located in Bengaluru, Karnataka, India.",
    "page": "https://en.wikipedia.org/wiki/Bengaluru_Palace",
    "photo": {
      "artist": "Chuggingtrails",
      "licence": "CC BY-SA 4.0",
      "url": "https://commons.wikimedia.org/wiki/File:Bangalore_Mysore_Maharaja_Palace.jpg"
    }
  }
];

export const siteById = (id?: string) => VENUE_SITES.find((s) => s.id === id);
