package com.sahaaye.data.model

data class SahaayeLocation(
    val id: String,
    val name: String,             // Short title (e.g., "Indore, MP" or "Vijay Nagar")
    val fullAddress: String,      // Detailed gali, mohalla, landmark address
    val locality: String,         // Sub-area / colony
    val latitude: Double,
    val longitude: Double,
    val placeType: String = "Locality" // "Landmark", "Market", "Temple", "Hospital", "Colony"
) {
    companion object {
        val DEFAULT = SahaayeLocation(
            id = "loc_default",
            name = "Indore, MP",
            fullAddress = "Rajwada Chowk, MG Road, Khajuri Bazar, Indore, MP 452002",
            locality = "Central Indore",
            latitude = 22.7196,
            longitude = 75.8577,
            placeType = "City Center"
        )

        val SAMPLE_LOCATIONS = listOf(
            DEFAULT,
            SahaayeLocation(
                id = "loc_vn",
                name = "Vijay Nagar",
                fullAddress = "Scheme No. 54, Near C21 Mall & Brilliant Convention Centre, AB Road, Indore, MP 452010",
                locality = "North Indore",
                latitude = 22.7533,
                longitude = 75.8937,
                placeType = "Commercial & Residential"
            ),
            SahaayeLocation(
                id = "loc_palasia",
                name = "56 Dukan, Palasia",
                fullAddress = "11/1 New Palasia Street, Near 56 Dukan Food Street, Indore, MP 452001",
                locality = "East Indore",
                latitude = 22.7244,
                longitude = 75.8839,
                placeType = "Food Street & Market"
            ),
            SahaayeLocation(
                id = "loc_rajwada",
                name = "Rajwada Palace",
                fullAddress = "MG Road, Bada Sarafa Bazar, Rajwada Heritage Zone, Indore, MP 452002",
                locality = "Old Indore",
                latitude = 22.7196,
                longitude = 75.8577,
                placeType = "Historical Landmark"
            ),
            SahaayeLocation(
                id = "loc_bhawarkua",
                name = "Bhawarkua",
                fullAddress = "Bhawarkua Main Square, Transport Nagar, Near DAVV Campus, Indore, MP 452014",
                locality = "South Indore",
                latitude = 22.6912,
                longitude = 75.8660,
                placeType = "Education Hub"
            ),
            SahaayeLocation(
                id = "loc_annapurna",
                name = "Annapurna Colony",
                fullAddress = "Annapurna Mandir Road, Usha Nagar Ext, Sudama Nagar, Indore, MP 452009",
                locality = "West Indore",
                latitude = 22.6980,
                longitude = 75.8350,
                placeType = "Residential & Temple"
            ),
            SahaayeLocation(
                id = "loc_myh",
                name = "MY Hospital",
                fullAddress = "Maharaja Yeshwantrao Hospital Rd, Sanyogitaganj, South Tukoganj, Indore, MP 452001",
                locality = "Central Indore",
                latitude = 22.7160,
                longitude = 75.8750,
                placeType = "Medical Centre"
            ),
            SahaayeLocation(
                id = "loc_scheme78",
                name = "Scheme 78",
                fullAddress = "Scheme No. 78 Part II, Near Prestige Institute, Vijay Nagar, Indore, MP 452010",
                locality = "North Indore",
                latitude = 22.7650,
                longitude = 75.8980,
                placeType = "Residential Colony"
            ),
            SahaayeLocation(
                id = "loc_lig",
                name = "LIG Square",
                fullAddress = "LIG Colony, AB Road, Near Industry House Square, Indore, MP 452008",
                locality = "East Indore",
                latitude = 22.7380,
                longitude = 75.8910,
                placeType = "Colony & Commercial"
            ),
            SahaayeLocation(
                id = "loc_bengali",
                name = "Bengali Square",
                fullAddress = "Kanadiya Main Road, Vaibhav Nagar, Ring Road Junction, Indore, MP 452016",
                locality = "East Indore",
                latitude = 22.7170,
                longitude = 75.9120,
                placeType = "Residential Junction"
            ),
            SahaayeLocation(
                id = "loc_silicon",
                name = "Silicon City, Rau",
                fullAddress = "AB Road Bypass, Silicon City Main Gate, Nihalpur Mundi, Indore, MP 452012",
                locality = "South-West Indore",
                latitude = 22.6450,
                longitude = 75.8230,
                placeType = "Township"
            ),
            SahaayeLocation(
                id = "loc_geeta",
                name = "Geeta Bhawan",
                fullAddress = "Geeta Bhawan Square, Manoramaganj, AB Road, Indore, MP 452001",
                locality = "Central Indore",
                latitude = 22.7185,
                longitude = 75.8850,
                placeType = "Commercial & Temple"
            )
        )
    }
}
