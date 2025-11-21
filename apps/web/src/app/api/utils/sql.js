import pkg from 'pg';
const { Pool } = pkg;

// Debug: Check if DATABASE_URL is loaded
console.log('🔍 DATABASE_URL exists:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  // Show first 30 chars and last 10 chars (hide password)
  const preview = url.substring(0, 30) + '...' + url.substring(url.length - 10);
  console.log('🔍 DATABASE_URL preview:', preview);
}

// Create connection pool
const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

// Helper to extract SQL and params from tagged template literal
function parseTemplate(strings, ...values) {
  let query = '';
  const params = [];
  
  for (let i = 0; i < strings.length; i++) {
    query += strings[i];
    if (i < values.length) {
      const value = values[i];
      // Always use single parameter placeholder - pg handles arrays/objects automatically
      query += `$${params.length + 1}`;
      params.push(value);
    }
  }
  
  return { query: query.trim(), params };
}

// Create sql function that mimics Neon's API
// If client is provided (for transactions), use it; otherwise use pool
function sql(strings, ...values) {
  if (!pool) {
    throw new Error(
      'No database connection string was provided. Perhaps process.env.DATABASE_URL has not been set'
    );
  }
  
  const { query, params } = parseTemplate(strings, ...values);
  
  // Check if we're in a transaction context (client passed via context)
  const client = sql._transactionClient || null;
  const executor = client || pool;
  
  return executor.query(query, params).then(result => result.rows);
}

// Add unsafe method for raw queries
sql.unsafe = (query, params = []) => {
  if (!pool) {
    throw new Error('No database connection string was provided');
  }
  const client = sql._transactionClient || null;
  const executor = client || pool;
  return executor.query(query, params).then(result => result.rows);
};

// Add transaction method
// Supports array of sql`` queries
sql.transaction = async (queries) => {
  if (!pool) {
    throw new Error('No database connection string was provided');
  }
  
  if (!Array.isArray(queries)) {
    throw new Error('sql.transaction expects an array of sql`` queries');
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Set transaction client context
    sql._transactionClient = client;
    
    try {
      // Execute all queries
      const results = await Promise.all(queries);
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Clear transaction client context
      sql._transactionClient = null;
    }
  } finally {
    client.release();
  }
};

export default sql;
