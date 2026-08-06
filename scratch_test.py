import psycopg2

connection_uri = "postgresql://postgres.oxkwycjmnrcowylhajnh:RubraDB30072026@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require"

try:
    print("Connecting to Supabase PostgreSQL...")
    conn = psycopg2.connect(connection_uri)
    cursor = conn.cursor()
    
    query = """
        select u1_0.id, u1_0.avatar, u1_0.average_cycle_length, u1_0.created_at, 
               u1_0.cycle_variability, u1_0.default_cycle_length, u1_0.default_period_duration, 
               u1_0.email, u1_0.name, u1_0.password_hash 
        from users u1_0 
        where u1_0.email='ayla.alieva@gmail.com'
    """
    
    print("Executing query...")
    cursor.execute(query)
    rows = cursor.fetchall()
    print("Result rows:", rows)
    
    cursor.close()
    conn.close()
except Exception as e:
    print("Database Query Error:", e)
