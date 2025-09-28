const pool = require('./database');
const { v4: uuidv4 } = require('uuid');

async function seedProperties() {
  try {
    // Get the default broker user
    const [brokers] = await pool.execute(
      "SELECT id FROM users WHERE email = 'broker@test.com'"
    );
    
    if (brokers.length === 0) {
      console.log('No broker found. Please run init-db first.');
      return;
    }
    
    const brokerId = brokers[0].id;
    
    const properties = [
      {
        id: uuidv4(),
        title: 'Modern 3-Bedroom House in Kololo',
        description: 'Beautiful modern house with garden, parking, and security. Perfect for families.',
        category: 'house',
        price: 450000000,
        currency: 'UGX',
        district: 'Kampala',
        area: 'Kololo',
        address: 'Plot 123, Kololo Road',
        size: 200,
        rooms: 3,
        bathrooms: 2,
        amenities: ['Parking', 'Garden', 'Security', 'Water', 'Electricity'],
        images: []
      },
      {
        id: uuidv4(),
        title: 'Prime Land for Sale in Kira',
        description: '2 acres of prime land perfect for development. Road access and utilities available.',
        category: 'land',
        price: 800000000,
        currency: 'UGX',
        district: 'Wakiso',
        area: 'Kira',
        address: 'Kira Town, Main Road',
        size: 8094,
        rooms: null,
        bathrooms: null,
        amenities: ['Road Access', 'Water', 'Electricity'],
        images: []
      },
      {
        id: uuidv4(),
        title: 'Luxury Apartment in Ntinda',
        description: 'Spacious 2-bedroom apartment with modern amenities and great location.',
        category: 'rental',
        price: 1200000,
        currency: 'UGX',
        district: 'Kampala',
        area: 'Ntinda',
        address: 'Ntinda Shopping Center Area',
        size: 120,
        rooms: 2,
        bathrooms: 2,
        amenities: ['Parking', 'Security', 'Water', 'Electricity', 'Internet'],
        images: []
      }
    ];
    
    for (const property of properties) {
      await pool.execute(`
        INSERT INTO properties (
          id, title, description, category, price, currency, district, area, address,
          size, rooms, bathrooms, amenities, images, broker_id, status, is_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', true)
      `, [
        property.id, property.title, property.description, property.category,
        property.price, property.currency, property.district, property.area, property.address,
        property.size, property.rooms, property.bathrooms, 
        JSON.stringify(property.amenities), JSON.stringify(property.images),
        brokerId
      ]);
    }
    
    console.log('Sample properties added successfully!');
  } catch (error) {
    console.error('Error seeding properties:', error);
  } finally {
    process.exit();
  }
}

seedProperties();