import type { Graph, GraphNode, GraphRelationship, PropertyValue } from '../domain/graph'

// Illustrative movie graph (a small Neo4j-style dataset). Ratings are approximate.
const people: [name: string, born: number, extraLabel?: string][] = [
  ['Keanu Reeves', 1964],
  ['Carrie-Anne Moss', 1967],
  ['Laurence Fishburne', 1961],
  ['Sandra Bullock', 1964],
  ['Tom Hanks', 1956],
  ['Tim Allen', 1953],
  ['Lana Wachowski', 1965, 'Director'],
  ['Lilly Wachowski', 1967, 'Director'],
  ['Chad Stahelski', 1968, 'Director'],
  ['Jan de Bont', 1943, 'Director'],
  ['John Lasseter', 1957, 'Director'],
  ['Robert Zemeckis', 1952, 'Director'],
]

const movies: [title: string, released: number, rating: number, tagline?: string][] = [
  ['The Matrix', 1999, 8.7, 'Welcome to the Real World'],
  ['The Matrix Reloaded', 2003, 7.2],
  ['John Wick', 2014, 7.4, "Don't set him off"],
  ['Speed', 1994, 7.3],
  ['Toy Story', 1995, 8.3],
  ['Cast Away', 2000, 7.8],
]

const genres = ['Action', 'Sci-Fi', 'Animation', 'Drama']

// [person, movie, role]
const acted: [string, string, string][] = [
  ['Keanu Reeves', 'The Matrix', 'Neo'],
  ['Carrie-Anne Moss', 'The Matrix', 'Trinity'],
  ['Laurence Fishburne', 'The Matrix', 'Morpheus'],
  ['Keanu Reeves', 'The Matrix Reloaded', 'Neo'],
  ['Carrie-Anne Moss', 'The Matrix Reloaded', 'Trinity'],
  ['Laurence Fishburne', 'The Matrix Reloaded', 'Morpheus'],
  ['Keanu Reeves', 'John Wick', 'John Wick'],
  ['Keanu Reeves', 'Speed', 'Jack Traven'],
  ['Sandra Bullock', 'Speed', 'Annie Porter'],
  ['Tom Hanks', 'Toy Story', 'Woody'],
  ['Tim Allen', 'Toy Story', 'Buzz Lightyear'],
  ['Tom Hanks', 'Cast Away', 'Chuck Noland'],
]

const directed: [string, string][] = [
  ['Lana Wachowski', 'The Matrix'],
  ['Lilly Wachowski', 'The Matrix'],
  ['Lana Wachowski', 'The Matrix Reloaded'],
  ['Lilly Wachowski', 'The Matrix Reloaded'],
  ['Chad Stahelski', 'John Wick'],
  ['Jan de Bont', 'Speed'],
  ['John Lasseter', 'Toy Story'],
  ['Robert Zemeckis', 'Cast Away'],
]

const inGenre: [string, string][] = [
  ['The Matrix', 'Action'],
  ['The Matrix', 'Sci-Fi'],
  ['The Matrix Reloaded', 'Action'],
  ['The Matrix Reloaded', 'Sci-Fi'],
  ['John Wick', 'Action'],
  ['Speed', 'Action'],
  ['Toy Story', 'Animation'],
  ['Cast Away', 'Drama'],
]

function buildSampleGraph(): Graph {
  const nodes: GraphNode[] = []
  const idOf = new Map<string, number>()
  const addNode = (key: string, labels: string[], properties: Record<string, PropertyValue>) => {
    const id = nodes.length + 1
    idOf.set(key, id)
    nodes.push({ id, labels, properties })
  }

  for (const [name, born, extra] of people) {
    addNode(name, extra ? ['Person', extra] : ['Person'], { name, born })
  }
  for (const [title, released, rating, tagline] of movies) {
    addNode(
      title,
      ['Movie'],
      tagline ? { title, released, rating, tagline } : { title, released, rating },
    )
  }
  for (const name of genres) addNode(name, ['Genre'], { name })

  const relationships: GraphRelationship[] = []
  const addRelationship = (
    type: string,
    from: string,
    to: string,
    properties: Record<string, PropertyValue> = {},
  ) => {
    relationships.push({
      id: relationships.length + 1,
      type,
      from: idOf.get(from) ?? 0,
      to: idOf.get(to) ?? 0,
      properties,
    })
  }

  acted.forEach(([person, movie, role], index) =>
    addRelationship('ACTED_IN', person, movie, { role, billing: (index % 3) + 1 }),
  )
  directed.forEach(([person, movie]) => addRelationship('DIRECTED', person, movie))
  inGenre.forEach(([movie, genre]) => addRelationship('IN_GENRE', movie, genre))

  return { nodes, relationships }
}

export const sampleGraph: Graph = buildSampleGraph()
export const sampleGraphJson: string = JSON.stringify(sampleGraph, null, 2)
