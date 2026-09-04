import { getDB } from './config/rxdb.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const seed = async (): Promise<void> => {
  try {
    const db = await getDB();
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
    const categories = await db.categories.insert([
      { name: 'appetizer' },
      { name: 'main' },
      { name: 'dessert' },
      { name: 'beverage' },
    ]);
    console.log(`Created ${categories.length} categories`);

    // Hash passwords for users
    const hashPassword = async (pw: string) => {
      const salt = await bcrypt.genSalt(10);
      return bcrypt.hash(pw, salt);
    };

    const usersData = [
      {
        name: 'Admin User',
        email: 'admin@restaurant.com',
        password: await hashPassword('admin123'),
        role: 'admin',
        phone: '555-0100',
      },
      {
        name: 'Staff One',
        email: 'staff@restaurant.com',
        password: await hashPassword('staff123'),
        role: 'staff',
        phone: '555-0101',
      },
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: await hashPassword('customer123'),
        role: 'customer',
        phone: '555-0102',
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: await hashPassword('customer123'),
        role: 'customer',
        phone: '555-0103',
      },
      {
        name: 'Bob Johnson',
        email: 'bob@example.com',
        password: await hashPassword('customer123'),
        role: 'customer',
        phone: '555-0104',
      },
    ];

    const users = await db.users.insert(usersData);
    console.log(`Created ${users.length} users`);

    // Insert menu items
    const menuItemsData = [
      {
        name: 'Bruschetta',
        description: 'Toasted bread with tomato, basil, and mozzarella',
        price: 8.99,
        category: 'appetizer',
        image: '/images/bruschetta.jpg',
        available: true,
      },
      {
        name: 'Calamari',
        description: 'Crispy fried squid with marinara sauce',
        price: 10.99,
        category: 'appetizer',
        image: '/images/calamari.jpg',
        available: true,
      },
      {
        name: 'Spring Rolls',
        description: 'Vegetable spring rolls with sweet chili dip',
        price: 7.49,
        category: 'appetizer',
        image: '/images/spring-rolls.jpg',
        available: true,
      },
      {
        name: 'Grilled Salmon',
        description: 'Atlantic salmon with lemon butter sauce and seasonal vegetables',
        price: 22.99,
        category: 'main',
        image: '/images/grilled-salmon.jpg',
        available: true,
      },
      {
        name: 'Ribeye Steak',
        description: '12oz ribeye with mashed potatoes and asparagus',
        price: 29.99,
        category: 'main',
        image: '/images/ribeye.jpg',
        available: true,
      },
      {
        name: 'Chicken Parmesan',
        description: 'Breaded chicken breast with marinara and melted cheese',
        price: 17.99,
        category: 'main',
        image: '/images/chicken-parm.jpg',
        available: true,
      },
      {
        name: 'Vegetable Pasta',
        description: 'Penne with seasonal vegetables in pesto cream sauce',
        price: 15.49,
        category: 'main',
        image: '/images/veggie-pasta.jpg',
        available: true,
      },
      {
        name: 'Beef Burger',
        description: 'Angus beef patty with cheddar, lettuce, and tomato',
        price: 14.99,
        category: 'main',
        image: '/images/burger.jpg',
        available: true,
      },
      {
        name: 'Tiramisu',
        description: 'Classic Italian coffee-flavored dessert',
        price: 8.49,
        category: 'dessert',
        image: '/images/tiramisu.jpg',
        available: true,
      },
      {
        name: 'Chocolate Lava Cake',
        description: 'Warm chocolate cake with molten center and ice cream',
        price: 9.99,
        category: 'dessert',
        image: '/images/lava-cake.jpg',
        available: true,
      },
      {
        name: 'Cheesecake',
        description: 'New York style cheesecake with berry compote',
        price: 7.99,
        category: 'dessert',
        image: '/images/cheesecake.jpg',
        available: true,
      },
      {
        name: 'Espresso',
        description: 'Double shot espresso',
        price: 3.49,
        category: 'beverage',
        image: '/images/espresso.jpg',
        available: true,
      },
      {
        name: 'Fresh Orange Juice',
        description: 'Freshly squeezed orange juice',
        price: 4.99,
        category: 'beverage',
        image: '/images/orange-juice.jpg',
        available: true,
      },
      {
        name: 'Mineral Water',
        description: 'Sparkling or still mineral water',
        price: 2.49,
        category: 'beverage',
        image: '/images/water.jpg',
        available: true,
      },
    ];

    const menuItems = await db.menuItems.insert(menuItemsData);
    console.log(`Created ${menuItems.length} menu items`);

    // Insert default restaurant settings
    await db.settings.insert({ tableCount: 10 });
    console.log('Inserted default restaurant settings');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seed();
