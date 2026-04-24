import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, ILike } from 'typeorm';
import { Transactions } from 'src/Entities/entities/Transactions';
import { Enrollment } from 'src/Entities/entities/Enrollment';
import { Courses } from 'src/Entities/entities/Courses';
import { Users } from 'src/Entities/entities/Users';
import {
  FeesResponseDto,
  TransactionDto,
  FeesStatsDto,
} from './dto/fees-response.dto';

@Injectable()
export class FeesService {
  constructor(
    @InjectRepository(Transactions)
    private readonly transactionsRepository: Repository<Transactions>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Courses)
    private readonly coursesRepository: Repository<Courses>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {}

  async getFeesData(
    page: number = 1,
    limit: number = 10,
    status?: string,
    studentName?: string,
    courseName?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<FeesResponseDto> {
    // 1. Create Query Builder
    const query = this.transactionsRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.enroll', 'enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.course', 'course');

    // 2. Filters (Using Entity Property Names)
    if (status) {
      query.andWhere('transaction.status = :status', { status });
    }

    if (studentName) {
      query.andWhere(
        "CONCAT(student.firstName, ' ', student.lastName) ILIKE :studentName",
        { studentName: `%${studentName}%` },
      );
    }

    if (courseName) {
      query.andWhere('course.courseName ILIKE :courseName', {
        courseName: `%${courseName}%`,
      });
    }

    if (startDate && endDate) {
      query.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    }

    // 3. Sorting and Pagination (Using getManyAndCount for safer execution)
    query
      .orderBy('transaction.createdAt', 'DESC')
      .skip((page - 1) * limit) 
      .take(limit);

    const [transactions, total] = await query.getManyAndCount();


    const formattedTransactions: TransactionDto[] = transactions.map((txn) => ({
      uuid: txn.uuid,
      studentId: txn.enroll?.student?.id || 0,
      studentName: txn.enroll?.student
        ? `${txn.enroll.student.firstName} ${txn.enroll.student.lastName}`
        : 'N/A',
      courseId: txn.enroll?.course?.id || 0,
      courseName: txn.enroll?.course?.courseName || 'N/A',
      amount: txn.amount,
      status: txn.status,
      paymentType: txn.paymentType,
      createdAt: txn.createdAt,
    }));

    const stats = await this.getFeesStats();

    return {
      stats,
      transactions: formattedTransactions,
      meta: {
        totalItems: total,
        itemCount: formattedTransactions.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  async getFeesStats(): Promise<FeesStatsDto> {
    // Get all transactions
    const allTransactions = await this.transactionsRepository.find();

    // Calculate stats
    const paidTransactions = allTransactions.filter((t) => t.status === 'paid');
    const pendingTransactions = allTransactions.filter(
      (t) => t.status === 'pending',
    );

    const totalRevenue = paidTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount),
      0,
    );

    const pendingPayments = pendingTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount),
      0,
    );

    return {
      totalRevenue: `$${totalRevenue.toFixed(2)}`,
      paidTransactionCount: paidTransactions.length,
      pendingPayments: `$${pendingPayments.toFixed(2)}`,
      pendingTransactionCount: pendingTransactions.length,
      totalTransactions: allTransactions.length,
    };
  }

  async updateTransactionStatus(
    transactionId: string,
    newStatus: 'pending' | 'paid',
  ): Promise<Transactions> {
    const transaction = await this.transactionsRepository.findOne({
      where: { uuid: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    transaction.status = newStatus;
    transaction.updatedAt = new Date();

    return this.transactionsRepository.save(transaction);
  }
}
