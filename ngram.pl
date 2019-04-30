###################################################################################################################################
# Matthew Lesniewicz
#
# Create a program that takes arguments n, m, and text files and uses the data to generate new tracks. 
# n is the n-gram size and m is the number of sentences that it needs to generate using the model.
#
# The user needs to first get text files for the arguments. 
# Then they need to type the command perl ngram.pl <n> <m> <textfile1.txt> <textfile2.txt> ...
# where n and m are both integers, followed by the names of source text files.
# Then the program outputs m sentences.
#
# First I collect the n and m values. Then I collect the text and alter it to include start tokens and correct formatting.
# Then I split each track into an array
# Then I find the frequency of each word group in each sentence from 1 word count up to n word counts.
# I store these frequencies in a hash with the keys being the phrases and the values being the counts.
# Then I find the probabilities of each word group with n word count by using the frequencies.
# Then I produce sentences by using the probablility table to find probable Notes that occur after a given seed
###################################################################################################################################
#use Data::Dumper;

my $n = 0;
my $m = 0;
my $input = saveText(@ARGV);
# print "Hello, This program generates midi tracks using an n-gram model and is written by none other than Matthew Lesniewicz himself.\n";
# print "Command line settings: n = $n m = $m\n";


my %freq;
my %probs;


#print $fInput;
my $fInput = formatText($input);
#print $totalNotes;
my $totalNotes = countNotes($fInput);


analyzeFreq($fInput);

calculateProbabilities();
print generateSentences();

#print Dumper(\%freq);
#print Dumper(\%probs);




# Alters and saves the data from the text files given as arguments
sub saveText {
	my $count = 0;
	my $string = '';
	my $arg = '';
	for (@ARGV) {
		$arg = $_;
		if ($count == 0) {
			$n = $arg;
			$count++;
			next;
		}
		elsif ($count == 1) {
			$m = $arg;
			$count++;
			next;
		}
		
		open(my $fh, '<:encoding(UTF-8)', $arg)
		or die "Could not open file '$arg' $!";
		
		while (my $row = <$fh>) {
			chomp $row;
			$string = $string . $row;
		}
		$string = $string . " ";
	}
return lc $string;
}

sub formatText {
	my( $text ) = @_;
	$text =~ s/\?/? <start>\ /g;
	$text = '<start> ' . $text;
	$text =~ s/<start>\s$//;
	return $text;
}

# Counts elements in altered string



sub countNotes {
	my( $text ) = @_;
	my @Notes = split / /, $text;
	return scalar(@Notes);
}

# Selects sentences for analysis of frequency



sub analyzeFreq {
	my( $text ) = @_;

	while ($text =~ /(<start>[^<]+)/g){
		my $sentence = $1;
		freqInSentence($sentence);
	}
	
}

# split sentence into tokens and record frequency of each word group



sub freqInSentence {
	my( $sentence ) = @_;	
	my @array = split /[\s\n]/, $sentence;
	
	# Individual word freq first, then bigrams..
	
	
	for (my $i = 0; $i < $n; $i++){
		
		for (my $j = 0; $j < scalar @array - $i; $j++){
			my $key = $array[$j];
			for (my $k = 1; $k <= $i; $k++){
				$key = $key . " " . $array[$j + $k];
			}
			$freq{$key}++;
		}
	}
}

# Uses frequency table to determine the probabilities of each word group with n word count
sub calculateProbabilities {
	# Goes through all word groups in the frequency hash
	foreach my $key (keys %freq){
		my @Notes = split / /, $key;
		# Checks to see if there are at least 2 elements in @Notes
		if (scalar @Notes > 1){
			my $newWord = $Notes[scalar @Notes - 1];
			my $given = $Notes[0];
			for (my $i = 1; $i < scalar @Notes - 1; $i++){
				$given = $given . " " . $Notes[$i];
			}
			my $runningTotal = 0;
			foreach my $inner (keys %{$probs{$given}}){
				if ($probs{$given}{$inner} > $runningTotal) {
					$runningTotal = $probs{$given}{$inner};
				}
			}
			$probs{$given}{$newWord} = ($freq{$given . " " . $newWord} / $freq{$given}) + $runningTotal;
			#print "probability of $newWord given $given: $probs{$given}{$newWord}";
		}
	}	
}

# Generates sentences using the probabilities



sub generateSentences {
	my $sentenceCount = 0;
	my $text = "";
	while ($sentenceCount < $m){
		my @seed = ("<start>");
		my $nextWord = "";
		while ($nextWord ne "." and $nextWord ne "?" and $nextWord ne "!"){
			my $rand = rand();
			$nextWord = generateWord(\@seed, $rand);
			$text = $text . " " . $nextWord;
			push @seed, $nextWord;
			if (scalar @seed > $n - 1){
				shift @seed;
			}
		}	
		$sentenceCount++;
	}
	return $text;
}

# Decides what the next word will be based



sub generateWord {
	my @seed = @{ $_[0] };
	my $roll = $_[1];
	my $seedStr = $seed[0];
	for (my $i = 1; $i < scalar @seed; $i++){
		$seedStr .= " " . $seed[$i];
	}
	my %wordOptions = %{$probs{$seedStr}};
	# sort all probablities and start with lowest value
	foreach my $inner (sort { $probs{$seedStr}{$a} <=> $probs{$seedStr}{$b} } keys %{$probs{$seedStr}}) {
		#checks to see if the roll is less than the probability
		if ($roll <= $probs{$seedStr}{$inner}){
			# print "GENERATING WORD FOR " . $seedStr . " USING " . $roll . " = " . $inner . "\n"; 
			return $inner;	
		}
	}
}