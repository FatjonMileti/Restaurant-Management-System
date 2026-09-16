import { getRxDB, getDB } from './config/rxdb.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const genId = () => crypto.randomUUID();

const seed = async (): Promise<void> => {
  try {
    await getRxDB();
    const db = getDB();
    console.log('RxDB connected for seeding...');

    // Helper to clear a collection
    const clearCollection = async (col: any) => {
      const docs = await col.find().exec();
      await Promise.all(docs.map((doc: any) => doc.remove()));
    };

    // Clear existing data
    await Promise.all([
      clearCollection(db.categories),
      clearCollection(db.users),
      clearCollection(db.menuItems),
      clearCollection(db.orders),
      clearCollection(db.reservations),
      clearCollection(db.settings),
    ]);
    console.log('Cleared existing data');

    // Insert categories
    const categoryNames = ['appetizer', 'main', 'dessert', 'beverage'];
    await Promise.all(categoryNames.map((name) => db.categories.insert({ _id: genId(), name })));
    console.log(`Created ${categoryNames.length} categories`);

    // Hash passwords for users
    const hashPassword = async (pw: string) => {
      const salt = await bcrypt.genSalt(10);
      return bcrypt.hash(pw, salt);
    };

    const usersData = [
      {
        _id: genId(),
        name: 'Admin User',
        email: 'admin@restaurant.com',
        password: await hashPassword('admin123'),
        role: 'admin',
        phone: '555-0100',
      },
      {
        _id: genId(),
        name: 'Staff One',
        email: 'staff@restaurant.com',
        password: await hashPassword('staff123'),
        role: 'staff',
        phone: '555-0101',
      },
      {
        _id: genId(),
        name: 'John Doe',
        email: 'john@example.com',
        password: await hashPassword('customer123'),
        role: 'customer',
        phone: '555-0102',
      },
      {
        _id: genId(),
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: await hashPassword('customer123'),
        role: 'customer',
        phone: '555-0103',
      },
      {
        _id: genId(),
        name: 'Bob Johnson',
        email: 'bob@example.com',
        password: await hashPassword('customer123'),
        role: 'customer',
        phone: '555-0104',
      },
    ];

    const createdUsers: any[] = [];
    for (const userData of usersData) {
      const userDoc = await db.users.insert(userData);
      createdUsers.push(userDoc.toJSON());
    }
    console.log(`Created ${usersData.length} users`);

    // Insert menu items
    const menuItemsData = [
      {
        _id: genId(),
        name: 'Bruschetta',
        description: 'Toasted bread with tomato, basil, and mozzarella',
        price: 8.99,
        category: 'appetizer',
        image: '/images/bruschetta.jpg',
        available: true,
      },
      {
        _id: genId(),
        name: 'Calamari',
        description: 'Crispy fried squid with marinara sauce',
        price: 10.99,
        category: 'appetizer',
        image: '/images/calamari.jpg',
        available: true,
      },
      {
        _id: genId(),
        name: 'Spring Rolls',
        description: 'Vegetable spring rolls with sweet chili dip',
        price: 7.49,
        category: 'appetizer',
        image: '/images/spring-rolls.jpg',
        available: true,
      },
      {
        _id: genId(),
        name: 'Grilled Salmon',
        description: 'Atlantic salmon with lemon butter sauce and seasonal vegetables',
        price: 22.99,
        category: 'main',
        image: '/images/grilled-salmon.jpg',
        available: true,
      },
      {
        _id: genId(),
        name: 'Ribeye Steak',
        description: '12oz ribeye with mashed potatoes and asparagus',
        price: 29.99,
        category: 'main',
        image: '/images/ribeye.jpg',
        available: true,
      },
      {
        _id: genId(),
        name: 'Chicken Parmesan',
        description: 'Breaded chicken breast with marinara and melted cheese',
        price: 17.99,
        category: 'main',
        image: '/images/chicken-parm.jpg',
        available: true,
      },
      {
        _id: genId(),
        name: 'Vegetable Pasta',
        description: 'Penne with seasonal vegetables in pesto cream sauce',
        price: 15.49,
        category: 'main',
        image: '/images/veggie-pasta.jpg',
        available: true,
      },
      {
        _id: genId(),
        name: 'Beef Burger',
        description: 'Angus beef patty with cheddar, lettuce, and tomato',
        price: 14.99,
        category: 'main',
        image: '/images/burger.jpg',
        available: true,
      },
      {
        _id: genId(),
        name: 'Tiramisu',
        description: 'Classic Italian coffee-flavored dessert',
        price: 8.49,
        category: 'dessert',
        image: '/images/tiramisu.jpg',
        available: true,
      },
      {
        _id: genId(),
        name: 'Chocolate Lava Cake',
        description: 'Warm chocolate cake with molten center and ice cream',
        price: 9.99,
        category: 'dessert',
        image: '/images/lava-cake.jpg',
        available: true,
      },
      {
        _id: genId(),
        name: 'Cheesecake',
        description: 'New York style cheesecake with berry compote',
        price: 7.99,
        category: 'dessert',
        image: '/images/cheesecake.jpg',
        available: true,
      },
      {
        _id: genId(),
        name: 'Espresso',
        description: 'Double shot espresso',
        price: 3.49,
        category: 'beverage',
        image: '/images/espresso.jpg',
        available: true,
      },
      {
        _id: genId(),
        name: 'Fresh Orange Juice',
        description: 'Freshly squeezed orange juice',
        price: 4.99,
        category: 'beverage',
        image: '/images/orange-juice.jpg',
        available: true,
      },
      {
        _id: genId(),
        name: 'Mineral Water',
        description: 'Sparkling or still mineral water',
        price: 2.49,
        category: 'beverage',
        image: '/images/water.jpg',
        available: true,
      },
    ];

    for (const itemData of menuItemsData) {
      await db.menuItems.insert({ ...itemData, updatedAt: new Date().toISOString() });
    }
    console.log(`Created ${menuItemsData.length} menu items`);

    // Insert default restaurant settings
    await db.settings.insert({
      _id: genId(),
      tableCount: 10,
      updatedAt: new Date().toISOString(),
    });
    console.log('Inserted default restaurant settings');

    // Insert sample reservations, including walk-in client contact details
    const today = new Date();
    const isoDate = (d: Date) => d.toISOString().slice(0, 10);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const userIdByEmail = (email: string) => createdUsers.find((u: any) => u.email === email)?._id;
    const reservationsData = [
      {
        _id: genId(),
        user: userIdByEmail('bob@example.com'),
        date: isoDate(tomorrow),
        time: '19:00',
        guests: 4,
        tableNumber: 3,
        status: 'confirmed',
        specialRequests: 'Window seat if possible',
        clientName: 'Bob Johnson',
        clientPhone: '555-0104',
        clientEmail: 'bob@example.com',
        createdAt: new Date().toISOString(),
      },
      {
        _id: genId(),
        user: userIdByEmail('john@example.com'),
        date: isoDate(today),
        time: '20:00',
        guests: 2,
        tableNumber: 5,
        status: 'confirmed',
        specialRequests: '',
        clientName: 'John Doe',
        clientPhone: '555-0102',
        clientEmail: 'john@example.com',
        createdAt: new Date().toISOString(),
      },
      {
        _id: genId(),
        user: userIdByEmail('jane@example.com'),
        date: '2024-01-15',
        time: '18:30',
        guests: 3,
        tableNumber: 2,
        status: 'completed',
        specialRequests: '',
        createdAt: new Date().toISOString(),
      },
    ];

    for (const reservationData of reservationsData) {
      await db.reservations.insert(reservationData);
    }
    console.log(`Created ${reservationsData.length} reservations`);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seed();
