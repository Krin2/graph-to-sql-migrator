export interface SampleQuery {
  title: string
  cypher: string
  sql: string
}

// Written for the table names generated from the sample graph (person, movie, genre, acted_in...)
export const sampleQueries: SampleQuery[] = [
  {
    title: 'Cast of every movie',
    cypher: `MATCH (p:Person)-[:ACTED_IN]->(m:Movie)
RETURN m.title, collect(p.name) AS actors
ORDER BY m.title`,
    sql: `SELECT m.title, group_concat(p.name, ', ') AS actors
FROM movie m
JOIN acted_in a ON a.to_id = m.id
JOIN person p ON p.id = a.from_id
GROUP BY m.id
ORDER BY m.title;`,
  },
  {
    title: 'Co-actors of Keanu Reeves',
    cypher: `MATCH (:Person {name: 'Keanu Reeves'})-[:ACTED_IN]->(m)<-[:ACTED_IN]-(co)
RETURN DISTINCT co.name
ORDER BY co.name`,
    sql: `SELECT DISTINCT co.name
FROM person k
JOIN acted_in ka ON ka.from_id = k.id
JOIN acted_in ca ON ca.to_id = ka.to_id AND ca.from_id <> k.id
JOIN person co ON co.id = ca.from_id
WHERE k.name = 'Keanu Reeves'
ORDER BY co.name;`,
  },
  {
    title: 'Movies per genre',
    cypher: `MATCH (g:Genre)<-[:IN_GENRE]-(m:Movie)
RETURN g.name, count(m) AS movies
ORDER BY movies DESC, g.name`,
    sql: `SELECT g.name, COUNT(*) AS movies
FROM genre g
JOIN in_genre ig ON ig.to_id = g.id
GROUP BY g.id
ORDER BY movies DESC, g.name;`,
  },
  {
    title: 'Average rating by director',
    cypher: `MATCH (d:Person)-[:DIRECTED]->(m:Movie)
RETURN d.name, round(avg(m.rating), 2) AS avg_rating
ORDER BY avg_rating DESC`,
    sql: `SELECT p.name, ROUND(AVG(m.rating), 2) AS avg_rating
FROM person p
JOIN directed d ON d.from_id = p.id
JOIN movie m ON m.id = d.to_id
GROUP BY p.id
ORDER BY avg_rating DESC;`,
  },
]
