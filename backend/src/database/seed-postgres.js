const { postgresDatabase } = require('./init-postgres');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    await postgresDatabase.connect();
    console.log('Connected to PostgreSQL for seeding.');

    // Clean all related tables for a clean slate
    await postgresDatabase.execute('DELETE FROM order_items');
    await postgresDatabase.execute('DELETE FROM orders');
    await postgresDatabase.execute('DELETE FROM cart_items');
    await postgresDatabase.execute('DELETE FROM wishlist_items');
    await postgresDatabase.execute('DELETE FROM user_addresses');
    await postgresDatabase.execute('DELETE FROM product_reviews');
    await postgresDatabase.execute('DELETE FROM email_tokens');
    await postgresDatabase.execute('DELETE FROM search_history');
    await postgresDatabase.execute('DELETE FROM products');
    await postgresDatabase.execute('DELETE FROM categories');
    await postgresDatabase.execute('DELETE FROM users');
    console.log('Deleted all rows from all main and related tables.');

    // Seed categories
    const categories = [
      { name: 'Electronics', slug: 'electronics', description: 'Electronic gadgets and devices.' },
      { name: 'Books', slug: 'books', description: 'Books and literature.' },
      { name: 'Clothing', slug: 'clothing', description: 'Apparel and accessories.' }
    ];
    for (const cat of categories) {
      await postgresDatabase.execute(
        'INSERT INTO categories (name, slug, description, is_active) VALUES ($1, $2, $3, TRUE) ON CONFLICT (slug) DO NOTHING',
        [cat.name, cat.slug, cat.description]
      );
    }
    console.log('Seeded categories.');

    // Seed users
    const password = await bcrypt.hash('user123', 10);
    const users = [
      { email: 'user1@example.com', first_name: 'John', last_name: 'Doe', password },
      { email: 'user2@example.com', first_name: 'Jane', last_name: 'Smith', password }
    ];
    for (const user of users) {
      await postgresDatabase.execute(
        'INSERT INTO users (email, first_name, last_name, password, is_active) VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (email) DO NOTHING',
        [user.email, user.first_name, user.last_name, user.password]
      );
    }
    console.log('Seeded users.');

    // Get category ids
    const cats = await postgresDatabase.query('SELECT id, slug FROM categories');
    const electronicsId = cats.find(c => c.slug === 'electronics')?.id;
    const booksId = cats.find(c => c.slug === 'books')?.id;
    const clothingId = cats.find(c => c.slug === 'clothing')?.id;

    // Seed products
    const products = [
      {
        name: 'Smartphone',
        slug: 'smartphone',
        description: 'A modern smartphone.',
        price: 699.99,
        category_id: electronicsId,
        stock: 50,
        images: ["/uploads/products/sample1.jpg"],
        tags: ["phone", "mobile"],
        attributes: { color: "black", storage: "128GB" }
      },
      {
        name: 'Novel Book',
        slug: 'novel-book',
        description: 'A best-selling novel.',
        price: 19.99,
        category_id: booksId,
        stock: 100,
        images: ["/uploads/products/sample2.jpg"],
        tags: ["book", "novel"],
        attributes: { author: "Famous Author" }
      },
      {
        name: 'T-Shirt',
        slug: 't-shirt',
        description: 'Comfortable cotton t-shirt.',
        price: 9.99,
        category_id: clothingId,
        stock: 200,
        images: ["/uploads/products/sample3.jpg"],
        tags: ["shirt", "clothing"],
        attributes: { size: "M", color: "white" }
      }
    ];
    for (const prod of products) {
      await postgresDatabase.execute(
        `INSERT INTO products (name, slug, description, price, category_id, stock, images, tags, attributes, status, is_featured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', FALSE)
         ON CONFLICT (slug) DO NOTHING`,
        [prod.name, prod.slug, prod.description, prod.price, prod.category_id, prod.stock, JSON.stringify(prod.images), JSON.stringify(prod.tags), JSON.stringify(prod.attributes)]
      );
    }
    console.log('Seeded products.');

    await postgresDatabase.close();
    console.log('Seeding complete!');
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  seed();
} 