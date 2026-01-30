import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Patch,
  Delete,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiParam,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create_quiz_dto';
import { JwtBlacklistGuard } from 'src/Auth/guards/jwt.guards';
import { UpdateQuizDto } from './dto/update_quiz.dto';
import { QuizDetailsResponseDto } from './dto/quiz_detail_response.dto';
import { SubmitQuizDto } from './dto/submit_quiz.dto';

@ApiTags('Quizzes')
@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @UseGuards(JwtBlacklistGuard)
  @Post('create')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Teacher creates a new quiz with questions and options',
  })
  @ApiResponse({ status: 201, description: 'Quiz created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation Error.' })
  create(@Body() createQuizDto: CreateQuizDto, @Req() req) {

    if (req.user.role_id === 3) {
      throw new UnauthorizedException('Only teachers can create quizzes.');
    }
    createQuizDto.created_by = req.user.id;
    return this.quizService.createQuiz(createQuizDto);
  }

  @UseGuards(JwtBlacklistGuard)
  @ApiBearerAuth('JWT-auth')
  @Patch('update/:id')
  @ApiOperation({ summary: 'Update an existing quiz' })
  @ApiResponse({ status: 201, description: 'Quiz updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation Error.' })
  update(@Param('id') id: number, @Body() updateQuizDto: UpdateQuizDto) {
    return this.quizService.updateQuiz(id, updateQuizDto);
  }

  @UseGuards(JwtBlacklistGuard)
  @ApiBearerAuth('JWT-auth')
  @Delete('delete/:id')
  @ApiOperation({ summary: 'Permanently delete a quiz (Hard Delete)' })
  @ApiParam({ name: 'id', description: 'The ID of the quiz to remove permanently', example: 5 })
  @ApiResponse({ status: 200, description: 'Quiz and its components deleted permanently.' })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  async Remove(@Param('id') id: number) {
    return await this.quizService.DeleteQuiz(id);
  }

  @UseGuards(JwtBlacklistGuard)
  @ApiBearerAuth('JWT-auth')
  @Get(':id')
  @ApiOperation({ summary: 'Get quiz details by ID (Hides correct answers for students)' })
  @ApiResponse({ status: 200, type: QuizDetailsResponseDto })
  async getQuiz(
    @Param('id') id: number,
    @Req() req,
  ) {
    return await this.quizService.getQuizById(id, req.user.role_id);
  }

  @UseGuards(JwtBlacklistGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('submit')
  @ApiOperation({ summary: 'Student submits their quiz answers' })
  @ApiResponse({ status: 201, description: 'Attempt recorded successfully.' })
  async submit(@Body() submitDto: SubmitQuizDto, @Req() req) {
    return await this.quizService.submitQuiz(req.user.id, submitDto);
  }
}
