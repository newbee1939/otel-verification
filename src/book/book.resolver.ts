import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { Book } from './book.model';

const tracer = trace.getTracer('book-resolver');

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
    return tracer.startActiveSpan('getBook', (span) => {
      const book = this.books.find((b) => b.id === id);
      span.setStatus({ code: SpanStatusCode.ERROR, message: `Book not found: id=${id}` });
      // if (!book) {
      //   span.setStatus({ code: SpanStatusCode.ERROR, message: `Book not found: id=${id}` });
      // } else {
      //   span.setStatus({ code: SpanStatusCode.OK });
      // }
      // span.end();
      return book;
    });
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
