import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Book } from './book.model';

@Resolver(() => Book)
export class BookResolver {
  private books: Book[] = [
    { id: 1, title: 'The Pragmatic Programmer', author: 'David Thomas' },
    { id: 2, title: 'Clean Code', author: 'Robert C. Martin' },
  ];

  @Query(() => [Book])
  getBooks(): Book[] {
    return this.books;
  }

  @Query(() => Book, { nullable: true })
  getBook(@Args('id', { type: () => Int }) id: number): Book | undefined {
    return this.books.find((b) => b.id === id);
  }

  @Mutation(() => Book)
  addBook(
    @Args('title') title: string,
    @Args('author') author: string,
  ): Book {
    const book: Book = { id: this.books.length + 1, title, author };
    this.books.push(book);
    return book;
  }
}
