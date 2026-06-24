import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import MenuItem from './models/MenuItem.js';
import Order from './models/Order.js';
import Reservation from './models/Reservation.js';

dotenv.config();

const seed = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('MongoDB connected for seeding...');

    await Promise.all([
      User.deleteMany({}),
      MenuItem.deleteMany({}),
      Order.deleteMany({}),
      Reservation.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    const users = await User.create([
      { name: 'Admin User', email: 'admin@restaurant.com', password: 'admin123', role: 'admin', phone: '555-0100' },
      { name: 'Staff One', email: 'staff@restaurant.com', password: 'staff123', role: 'staff', phone: '555-0101' },
      { name: 'John Doe', email: 'john@example.com', password: 'customer123', role: 'customer', phone: '555-0102' },
      { name: 'Jane Smith', email: 'jane@example.com', password: 'customer123', role: 'customer', phone: '555-0103' },
      { name: 'Bob Johnson', email: 'bob@example.com', password: 'customer123', role: 'customer', phone: '555-0104' },
    ]);
    console.log(`Created ${users.length} users`);

    const [admin, staff, john, jane, bob] = users;

    const menuItems = await MenuItem.create([
      { name: 'Bruschetta', description: 'Toasted bread with tomato, basil, and mozzarella', price: 8.99, category: 'appetizer', image: '/images/bruschetta.jpg', available: true },
      { name: 'Calamari', description: 'Crispy fried squid with marinara sauce', price: 10.99, category: 'appetizer', image: '/images/calamari.jpg', available: true },
      { name: 'Spring Rolls', description: 'Vegetable spring rolls with sweet chili dip', price: 7.49, category: 'appetizer', image: '/images/spring-rolls.jpg', available: true },
      { name: 'Grilled Salmon', description: 'Atlantic salmon with lemon butter sauce and seasonal vegetables', price: 22.99, category: 'main', image: '/images/grilled-salmon.jpg', available: true },
      { name: 'Ribeye Steak', description: '12oz ribeye with mashed potatoes and asparagus', price: 29.99, category: 'main', image: '/images/ribeye.jpg', available: true },
      { name: 'Chicken Parmesan', description: 'Breaded chicken breast with marinara and melted cheese', price: 17.99, category: 'main', image: '/images/chicken-parm.jpg', available: true },
      { name: 'Vegetable Pasta', description: 'Penne with seasonal vegetables in pesto cream sauce', price: 15.49, category: 'main', image: '/images/veggie-pasta.jpg', available: true },
      { name: 'Beef Burger', description: 'Angus beef patty with cheddar, lettuce, and tomato', price: 14.99, category: 'main', image: '/images/burger.jpg', available: true },
      { name: 'Tiramisu', description: 'Classic Italian coffee-flavored dessert', price: 8.49, category: 'dessert', image: '/images/tiramisu.jpg', available: true },
      { name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center and ice cream', price: 9.99, category: 'dessert', image: '/images/lava-cake.jpg', available: true },
      { name: 'Cheesecake', description: 'New York style cheesecake with berry compote', price: 7.99, category: 'dessert', image: '/images/cheesecake.jpg', available: true },
      { name: 'Espresso', description: 'Double shot espresso', price: 3.49, category: 'beverage', image: '/images/espresso.jpg', available: true },
      { name: 'Fresh Orange Juice', description: 'Freshly squeezed orange juice', price: 4.99, category: 'beverage', image: '/images/orange-juice.jpg', available: true },
      { name: 'Mineral Water', description: 'Sparkling or still mineral water', price: 2.49, category: 'beverage', image: '/images/water.jpg', available: true },
    ]);
    console.log(`Created ${menuItems.length} menu items`);

    const [bruschetta, calamari, springRolls, salmon, ribeye, chickenParm, veggiePasta, burger, tiramisu, lavaCake, cheesecake, espresso, oj, water] = menuItems;

    const orders = await Order.create([
      {
        user: john._id,
        items: [
          { menuItem: calamari._id, name: 'Calamari', quantity: 1, price: 10.99 },
          { menuItem: ribeye._id, name: 'Ribeye Steak', quantity: 1, price: 29.99 },
          { menuItem: tiramisu._id, name: 'Tiramisu', quantity: 1, price: 8.49 },
        ],
        totalAmount: 49.47,
        status: 'completed',
        tableNumber: 5,
        paymentMethod: 'card',
      },
      {
        user: jane._id,
        items: [
          { menuItem: bruschetta._id, name: 'Bruschetta', quantity: 2, price: 8.99 },
          { menuItem: salmon._id, name: 'Grilled Salmon', quantity: 1, price: 22.99 },
          { menuItem: cheesecake._id, name: 'Cheesecake', quantity: 1, price: 7.99 },
          { menuItem: oj._id, name: 'Fresh Orange Juice', quantity: 2, price: 4.99 },
        ],
        totalAmount: 53.94,
        status: 'preparing',
        tableNumber: 3,
        paymentMethod: 'card',
      },
      {
        user: bob._id,
        items: [
          { menuItem: springRolls._id, name: 'Spring Rolls', quantity: 1, price: 7.49 },
          { menuItem: burger._id, name: 'Beef Burger', quantity: 1, price: 14.99 },
          { menuItem: lavaCake._id, name: 'Chocolate Lava Cake', quantity: 1, price: 9.99 },
        ],
        totalAmount: 32.47,
        status: 'pending',
        tableNumber: 7,
        paymentMethod: 'cash',
      },
      {
        user: john._id,
        items: [
          { menuItem: chickenParm._id, name: 'Chicken Parmesan', quantity: 1, price: 17.99 },
          { menuItem: espresso._id, name: 'Espresso', quantity: 1, price: 3.49 },
        ],
        totalAmount: 21.48,
        status: 'cancelled',
        tableNumber: 2,
        paymentMethod: 'cash',
      },
      {
        user: jane._id,
        items: [
          { menuItem: veggiePasta._id, name: 'Vegetable Pasta', quantity: 1, price: 15.49 },
          { menuItem: water._id, name: 'Mineral Water', quantity: 1, price: 2.49 },
        ],
        totalAmount: 17.98,
        status: 'completed',
        tableNumber: 1,
        paymentMethod: 'card',
      },
    ]);
    console.log(`Created ${orders.length} orders`);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const reservations = await Reservation.create([
      {
        user: john._id,
        date: tomorrow,
        time: '19:00',
        guests: 4,
        tableNumber: 5,
        status: 'confirmed',
        specialRequests: 'Anniversary celebration',
      },
      {
        user: jane._id,
        date: dayAfter,
        time: '20:30',
        guests: 2,
        tableNumber: 3,
        status: 'confirmed',
        specialRequests: 'Window table preferred',
      },
      {
        user: bob._id,
        date: nextWeek,
        time: '18:00',
        guests: 6,
        tableNumber: 8,
        status: 'confirmed',
        specialRequests: '',
      },
      {
        user: john._id,
        date: tomorrow,
        time: '12:00',
        guests: 2,
        tableNumber: 2,
        status: 'cancelled',
        specialRequests: '',
      },
      {
        user: jane._id,
        date: new Date(today.setDate(today.getDate() - 1)),
        time: '19:30',
        guests: 3,
        tableNumber: 4,
        status: 'completed',
        specialRequests: 'Birthday dinner',
      },
    ]);
    console.log(`Created ${reservations.length} reservations`);

    console.log('\n✅ Seed data inserted successfully!');
    console.log('\nLogin credentials:');
    console.log('  Admin:    admin@restaurant.com / admin123');
    console.log('  Staff:    staff@restaurant.com / staff123');
    console.log('  Customer: john@example.com / customer123');
    console.log('  Customer: jane@example.com / customer123');
    console.log('  Customer: bob@example.com / customer123');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
